@echo off
REM IsshanTV Guardian - Native Messaging Host Launcher
REM This script is registered with Chrome and launches the Node.js server.
REM Chrome communicates with this process via stdin/stdout.

setlocal

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0
set SERVER_DIR=%SCRIPT_DIR%..\server

REM Run the server in native messaging host mode
REM --nm-host tells the server to use the native messaging protocol on stdin/stdout
node "%SERVER_DIR%\index.js" --nm-host --host=192.168.1.15

endlocal
