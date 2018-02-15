# intellij-rename-bug
https://youtrack.jetbrains.com/issue/WEB-31206

## Repro

1. Go to `bar.js`, rename export to something else
1. Go to `foo.jsx`, expect that the usage and imports get updated. Only the usage gets updated.
