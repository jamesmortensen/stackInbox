#!/bin/sh
#
# Quick build script for developing the extension without needing to restart the browser. See:
#  https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Getting_started_with_cfx#Developing_without_cfx_run
#
# To turn on logging in the Browser Console, see:
#  https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/console#Logging_Levels
#
cfx xpi --output-file=extension.xpi
wget --post-file=extension.xpi http://localhost:8888/
