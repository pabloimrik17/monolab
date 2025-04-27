// This limit is only for lint-staged files, not for the whole project
const ESLINT_MAX_WARNINGS = 60;
const KNIP_MAX_ISSUES = 100;

// eslint-disable-next-line no-undef
module.exports = {
    "**/*": [
        // the callback function is used to avoid files in the commit being
        // passed to knip
        `eslint --max-warnings ${ESLINT_MAX_WARNINGS}`,
        () => `knip --max-issues ${KNIP_MAX_ISSUES}`,
        "prettier --write --ignore-unknown",
    ],
    // "*.md": "markdownlint --fix",
    "*.css": "stylelint --fix",
    "*.scss": "stylelint --fix",
};
