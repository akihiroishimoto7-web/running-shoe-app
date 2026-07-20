@echo off
rem Monthly wrapper for Task Scheduler (keep this file ASCII-only)
"C:\Program Files\nodejs\node.exe" "%~dp0update_ameblo_links.js" >> "%~dp0task_run.log" 2>&1
