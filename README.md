# git-autoshelve
TFS-like autoshelving for GIT repository

## Installation
`npm i git-autoshelve -g`

## Run autoshelve
`gitautoshelve "/basepath/to/git/repository/"`
This cmd create branch "autoshelve/[system user username]/[name of branch checkouted]" and update given branch each time it is executed.
