#!/bin/bash
#
# Will monitor any relevant files for changes and trigger a build if
# it detects a change

ls src/*.flow.js | entr yarn run build
