#!/bin/sh
# Prints an installed skill for a command to inject: the Skill tool refuses
# skills that set disable-model-invocation. Usage: load-skill.sh <plugin> <skill>
plugin=$1
skill=$2
root=${CLAUDE_CONFIG_DIR:-$HOME/.claude}

file=$(ls -t "$root"/plugins/cache/*/"$plugin"/*/skills/*/"$skill"/SKILL.md \
    "$root"/plugins/cache/*/"$plugin"/*/skills/"$skill"/SKILL.md \
    "$root/skills/$skill/SKILL.md" 2>/dev/null | head -n 1)

if [ -z "$file" ]; then
    echo "The \`$skill\` skill is not installed; continue without it."
    exit 0
fi

echo "Base directory for this skill: $(dirname "$file")"
echo
awk 'NR == 1 && $0 == "---" { fm = 1; next } fm && $0 == "---" { fm = 0; next } !fm' "$file"
