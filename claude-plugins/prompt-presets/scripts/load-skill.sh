#!/bin/sh
# Prints an installed skill for a command to inject: the Skill tool refuses
# skills that set disable-model-invocation. Usage: load-skill.sh <plugin> <skill>
plugin=$1
skill=$2
root=${CLAUDE_CONFIG_DIR:-$HOME/.claude}

file=$(ls -t "$root"/plugins/cache/*/"$plugin"/*/skills/*/"$skill"/SKILL.md \
    "$root"/plugins/cache/*/"$plugin"/*/skills/"$skill"/SKILL.md 2>/dev/null | head -n 1)
# Standalone fallback, personal over project as Claude Code ranks same-name skills:
# a checkout's own `<skill>` must not shadow the requested plugin's.
for standalone in "$root/skills/$skill/SKILL.md" "$PWD/.claude/skills/$skill/SKILL.md"; do
    if [ -z "$file" ] && [ -f "$standalone" ]; then file=$standalone; fi
done

if [ -z "$file" ]; then
    echo "The \`$skill\` skill is not installed; continue without it."
    exit 0
fi

echo "Base directory for this skill: $(dirname "$file")"
echo
awk 'NR == 1 && $0 == "---" { fm = 1; next } fm && $0 == "---" { fm = 0; next } !fm' "$file"
