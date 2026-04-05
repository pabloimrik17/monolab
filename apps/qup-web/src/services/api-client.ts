import { injectable } from "inversify";

@injectable()
export class ApiClient {
    // Intentionally thin — ViewModels call server functions directly.
    // This class exists for the DI binding and potential future use.
}
