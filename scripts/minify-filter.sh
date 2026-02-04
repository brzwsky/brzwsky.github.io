#!/bin/bash
# Git filter to replace app.js/styles.css with minified versions on commit
# and restore on checkout

OPERATION=$1  # "clean" (commit) or "smudge" (checkout)

if [ "$OPERATION" = "clean" ]; then
    # Replace with minified versions when committing
    sed 's|src="app\.js"|src="app.minified.js"|g; s|href="styles\.css"|href="style.minified.css"|g'
elif [ "$OPERATION" = "smudge" ]; then
    # Restore non-minified versions when checking out
    sed 's|src="app\.minified\.js"|src="app.js"|g; s|href="style\.minified\.css"|href="styles.css"|g'
else
    cat
fi
