/**
 * A function that returns a string "cool".
 *
 *
 * @returns {string} Returns the string "cool".
 */
export const coolReactFunction = (): "cool" => {
    return "cool";
};

/**
 * A function that randomly returns either "cool" or "notCool".
 *
 * @returns {("cool" | "notCool")} Returns either "cool" or "notCool" randomly.
 */
export const maybeCoolFunction = (): "cool" | "notCool" => {
    return Math.random() > 0.5 ? "cool" : "notCool";
};
