// Adapted from @jupyterlite/pyodide-kernel 0.8.6 (BSD-3-Clause).
import coincident from "coincident";
import { PyodideRemoteKernel } from "@jupyterlite/pyodide-kernel/lib/worker";
import {
  ContentsAPI,
  DriveFS,
} from "@jupyterlite/services/lib/contents/drivefs";
import type {
  TDriveMethod,
  TDriveRequest,
  TDriveResponse,
} from "@jupyterlite/services/lib/contents/drivefs";
import type {
  ICoincidentPyodideWorkerKernel,
  IPyodideWorkerKernel,
} from "@jupyterlite/pyodide-kernel/lib/tokens";

const api = coincident(self) as ICoincidentPyodideWorkerKernel;
class NotebookContents extends ContentsAPI {
  request<T extends TDriveMethod>(data: TDriveRequest<T>): TDriveResponse<T> {
    return api.processDriveRequest(data);
  }
}
class NotebookDrive extends DriveFS {
  createAPI(options: DriveFS.IOptions): ContentsAPI {
    return new NotebookContents(options);
  }
}
const interruptBuffer = new Promise<Uint8Array>((resolve) => {
  const receive = (event: MessageEvent) => {
    const buffer = event.data?.notebookpilotInterrupt;
    if (
      buffer instanceof Uint8Array &&
      buffer.buffer instanceof SharedArrayBuffer &&
      buffer.length === 1
    ) {
      self.removeEventListener("message", receive);
      resolve(buffer);
    }
  };
  self.addEventListener("message", receive);
});

class NotebookPilotPython extends PyodideRemoteKernel {
  protected async initFilesystem(options: IPyodideWorkerKernel.IOptions) {
    if (!options.mountDrive) return;
    const { FS, PATH, ERRNO_CODES } = this._pyodide;
    const mountpoint = "/drive";
    const drive = new NotebookDrive({
      FS,
      PATH,
      ERRNO_CODES,
      mountpoint,
      baseUrl: options.baseUrl,
      driveName: this._driveName,
    });
    FS.mkdirTree(mountpoint);
    FS.mount(drive, {}, mountpoint);
    FS.chdir(mountpoint);
    this._driveFS = drive;
  }
  protected async initRuntime(options: IPyodideWorkerKernel.IOptions) {
    await super.initRuntime(options);
    this._pyodide.setInterruptBuffer(await interruptBuffer);
  }

  protected sendInputRequest(prompt: string, password: boolean) {
    return api.processStdinRequest({ prompt, password });
  }
}

const runtime = new NotebookPilotPython();
runtime.registerWorkerMessageCallback(api.processWorkerMessage.bind(api));
runtime.registerLogMessageCallback(api.processLogMessage.bind(api));
api.initialize = runtime.initialize.bind(runtime);
api.execute = runtime.execute.bind(runtime);
api.complete = runtime.complete.bind(runtime);
api.inspect = runtime.inspect.bind(runtime);
api.isComplete = runtime.isComplete.bind(runtime);
api.commInfo = runtime.commInfo.bind(runtime);
api.commOpen = runtime.commOpen.bind(runtime);
api.commMsg = runtime.commMsg.bind(runtime);
api.commClose = runtime.commClose.bind(runtime);
api.inputReply = runtime.inputReply.bind(runtime);
self.postMessage({ notebookpilotReady: true });
