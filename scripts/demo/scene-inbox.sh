# The Inbox scene, sourced by `stage.sh scene inbox`: fourteen agents working out of sight, and the one card that needs
# the person. Stand-ins only: the cover shows nothing else.
clear_stage
fake herdr-t3 "Fold the tab bar's controls at 768px" claude working
fake herdr-t3 "Tests for the close dialog" codex working
fake herdr-t3 "Release notes" pi working
fake herdr-t3-inbox "Walk the shelves with cmd-]" pi working
fake herdr-t3-inbox "Settle from a tab's menu" codex working
fake herdr-t3-inbox "Undo notice for Unpin" claude working
fake herdling "Menu bar badge for blocked agents" codex working
fake herdling "Notarize the release build" claude working
fake herdling "Launch at login" pi working
fake pulls.review "Multi-repo branch picker" claude working
fake pulls.review "Cache diff stats per commit" codex working
fake pulls.review "Stream the analysis as it's written" pi working
fake pi-stuff "Permission policy for skills" claude working
fake pi-stuff "Bump to pi 1.4" pi working
fake pi-stuff "Reproduce the Linux install bug" codex blocked
focus "$t"
sleep 3
demo herdr-app shot "$D/inbox.png"
