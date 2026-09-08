
Set WshShell = CreateObject("WScript.Shell")
Set shortcut = WshShell.CreateShortcut("C:\Users\93SAL\Desktop\Gestion Électorale.lnk")
shortcut.TargetPath = "C:\Users\93SAL\.gemini\antigravity\scratch\electoral_web_app\START_APP.bat"
shortcut.WorkingDirectory = "C:\Users\93SAL\.gemini\antigravity\scratch\electoral_web_app"
shortcut.Description = "Application Web de Gestion Électorale"
shortcut.Save
