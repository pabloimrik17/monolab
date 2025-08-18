import { useState } from "react";
import { BaseViewModel } from "./base.viewmodel.js";

/**
 * Custom hook that initializes and returns a single instance of a ViewModel.
 * The ViewModel instance persists across component renders.
 *
 * @template T The type extending the BaseViewModel.
 * @param {() => T} viewModel A factory function that creates the ViewModel instance.
 * @returns {T} The single instance of the provided ViewModel.
 */
export const useViewModel = <T extends BaseViewModel>(
    viewModel: () => T
): T => {
    const [instance] = useState<T>(() => viewModel());

    return instance;
};
