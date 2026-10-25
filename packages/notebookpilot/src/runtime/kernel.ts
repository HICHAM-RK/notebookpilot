// Adapted from @jupyterlite/pyodide-kernel 0.8.6 (BSD-3-Clause).
import { PyodideKernel } from "@jupyterlite/pyodide-kernel";
import type { KernelMessage } from "@jupyterlab/services";
import { DriveContentsProcessor } from "@jupyterlite/services";
import type { IPyodideWorkerKernel } from "@jupyterlite/pyodide-kernel/lib/tokens";
import coincident from "coincident";
import { PromiseDelegate } from "@lumino/coreutils";
import { InterruptChannel, interruptChannels } from "./interrupt";
import workerUrl from "./python.worker.js";

export class InterruptibleKernel extends PyodideKernel {
  protected initWorker(options: PyodideKernel.IOptions): Worker {
    if (!crossOriginIsolated) return super.initWorker(options);
    const channel = new InterruptChannel();
    interruptChannels.set(this.id, channel);
    // The standalone worker is emitted as an asset by the extension build.
    const worker = new Worker(workerUrl, {
      type: "module",
    });
    const ready = (event: MessageEvent) => {
      if (event.data?.notebookpilotReady !== true) return;
      worker.removeEventListener("message", ready);
      worker.postMessage({ notebookpilotInterrupt: channel.buffer });
    };
    worker.addEventListener("message", ready);
    return worker;
  }

  protected initRemote(options: PyodideKernel.IOptions): IPyodideWorkerKernel {
    if (!crossOriginIsolated) return super.initRemote(options);
    const kernel = this as unknown as {
      _worker: Worker;
      _processLogMessage: (payload: unknown) => void;
      _processWorkerMessage: (message: unknown) => void;
      _inputDelegate: PromiseDelegate<string>;
      _ready: PromiseDelegate<void>;
      _logger: (options: unknown) => void;
      initRemoteOptions: (
        value: PyodideKernel.IOptions,
      ) => IPyodideWorkerKernel.IOptions;
    };
    const remote = coincident(kernel._worker) as unknown as {
      initialize: (options: IPyodideWorkerKernel.IOptions) => Promise<void>;
      processDriveRequest: (data: unknown) => Promise<unknown>;
      processStdinRequest: (content: unknown) => Promise<string>;
      processLogMessage: (payload: unknown) => void;
      processWorkerMessage: (message: unknown) => void;
    };
    let contents: DriveContentsProcessor | null = null;
    remote.processLogMessage = kernel._processLogMessage.bind(this);
    remote.processWorkerMessage = kernel._processWorkerMessage.bind(this);
    remote.processDriveRequest = async (data) => {
      contents ??= new DriveContentsProcessor({
        contentsManager: options.contentsManager,
      });
      return contents.processDriveRequest(data as never);
    };
    remote.processStdinRequest = async (content) => {
      kernel._processWorkerMessage({ type: "input_request", content });
      kernel._inputDelegate = new PromiseDelegate<string>();
      return kernel._inputDelegate.promise;
    };
    void remote
      .initialize(kernel.initRemoteOptions(options))
      .then(() => kernel._ready.resolve())
      .catch((error: Error) => {
        kernel._logger({
          payload: { type: "text", level: "critical", data: error.message },
          kernelId: this.id,
        });
        kernel._ready.reject(error.message);
      });
    return remote as unknown as IPyodideWorkerKernel;
  }

  async executeRequest(content: KernelMessage.IExecuteRequestMsg["content"]) {
    const channel = interruptChannels.get(this.id);
    const messageId = this.parent?.header.msg_id;
    if (!messageId) throw new Error("Execution parent message missing");
    channel?.begin(messageId);
    try {
      return await super.executeRequest(content);
    } finally {
      channel?.end(messageId);
    }
  }

  dispose(): void {
    interruptChannels.delete(this.id);
    super.dispose();
  }
}
