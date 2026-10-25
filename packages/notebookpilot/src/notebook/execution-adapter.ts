import type { INotebookTracker } from "@jupyterlab/notebook";
import type { CodeCell } from "@jupyterlab/cells";
import type { ISessionContext } from "@jupyterlab/apputils";
import type { Kernel } from "@jupyterlab/services";
import { PolicyStore } from "../control/policy";
import type { ExecutionAdapter } from "./execution";
import { interruptChannels } from "../runtime/interrupt";

type ExecuteCell = (
  cell: CodeCell,
  session: ISessionContext,
  metadata: { notebookpilotExecutionId: string },
) => Promise<{ content: { status: string } } | void>;

export function createExecutionAdapter(
  tracker: INotebookTracker,
  policies: PolicyStore,
  execute: ExecuteCell,
): ExecutionAdapter {
  function resolve(notebookId: string, cellId: string) {
    if (!policies.canRead(notebookId, cellId)) return null;
    const panel = tracker.find((candidate) => candidate.id === notebookId);
    if (!panel || panel.isDisposed) return null;
    const cells = panel.content.widgets.filter(
      (cell) => cell.model.id === cellId,
    );
    const kernel = panel.sessionContext.session?.kernel;
    if (
      cells.length !== 1 ||
      cells[0].isDisposed ||
      cells[0].model.type !== "code" ||
      !kernel
    )
      return null;
    return { panel, cell: cells[0] as CodeCell, kernel };
  }
  return {
    read: (notebookId, cellId) => {
      const target = resolve(notebookId, cellId);
      return target
        ? {
            source: target.cell.model.sharedModel.getSource(),
            kernelId: target.kernel.id,
            type: "code",
          }
        : null;
    },
    run: async (notebookId, cellId, expected, signal) => {
      if (signal.aborted) throw new Error("CANCELLED");
      if (!policies.canWrite(notebookId, cellId))
        throw new Error("ACCESS_DENIED");
      const target = resolve(notebookId, cellId);
      if (
        !target ||
        target.kernel.id !== expected.kernelId ||
        target.cell.model.sharedModel.getSource() !== expected.source
      )
        throw new Error("STALE_CELL");
      const { kernel, cell, panel } = target;
      if (kernel.status !== "idle") throw new Error("KERNEL_UNAVAILABLE");
      const token = crypto.randomUUID();
      let ownMessageId: string | null = null;
      let foreignWork = false;
      let interruptSent = false;
      const observe = (
        _sender: Kernel.IKernelConnection,
        args: Kernel.IAnyMessageArgs,
      ) => {
        const { msg, direction } = args;
        if (direction === "send" && msg.header.msg_type === "execute_request") {
          if (msg.metadata.notebookpilotExecutionId === token)
            ownMessageId = msg.header.msg_id;
          else foreignWork = true;
        }
        if (
          direction === "recv" &&
          msg.header.msg_type === "execute_input" &&
          msg.parent_header.msg_id !== ownMessageId
        )
          foreignWork = true;
        abort();
      };
      const abort = () => {
        // An interrupt affects the whole kernel. Decline if another run was observed.
        if (
          signal.aborted &&
          !interruptSent &&
          ownMessageId &&
          !foreignWork &&
          kernel.status === "busy" &&
          panel.sessionContext.session?.kernel === kernel
        ) {
          interruptSent = true;
          const channel = interruptChannels.get(kernel.id);
          if (channel) channel.interrupt(ownMessageId);
          else void kernel.interrupt().catch(() => undefined);
        }
      };
      kernel.anyMessage.connect(observe);
      // Cancellation can arrive before the kernel acknowledges execution as busy.
      kernel.statusChanged.connect(abort);
      signal.addEventListener("abort", abort, { once: true });
      try {
        const reply = await execute(cell, panel.sessionContext, {
          notebookpilotExecutionId: token,
        });
        if (signal.aborted) throw new Error("CANCELLED");
        if (reply && reply.content.status !== "ok")
          throw new Error("EXECUTION_FAILED");
        if (cell.isDisposed || !policies.canRead(notebookId, cellId))
          throw new Error("ACCESS_DENIED");
        return JSON.stringify(cell.model.outputs.toJSON());
      } finally {
        signal.removeEventListener("abort", abort);
        kernel.anyMessage.disconnect(observe);
        kernel.statusChanged.disconnect(abort);
      }
    },
  };
}
