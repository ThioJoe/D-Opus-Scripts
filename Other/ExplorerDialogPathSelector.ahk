; This script lets you press a key (default middle mouse) where it shows a list of open Directory Opus and/or Windows Explorer paths. Including all tabs.
;
; Source Repo: https://github.com/ThioJoe/D-Opus-Scripts
; Parts of the logic from this script: https://gist.github.com/akaleeroy/f23bd4dd2ddae63ece2582ede842b028#file-currently-opened-folders-md

#Requires AutoHotkey v2.0
#SingleInstance force
SetWorkingDir(A_ScriptDir)

; Configuration
activeTabSuffix := ""  		 ;  Appears to the right of the active path for each window group
activeTabPrefix := "► " 	 ;  Appears to the left of the active path for each window group
inactiveTabPrefix := "    "  ; Indentation for inactive tabs, so they line up
dopusRTPath := "C:\Program Files\GPSoftware\Directory Opus\dopusrt.exe"  ; Path to dopusrt.exe - can be empty to disable Directory Opus integration

; Hotkey to show the menu. Default is Middle Mouse Button. "~" in front of the key name ensures it doesn't hijack all use of the key for other programs.
f_Hotkey := "~MButton"

; Auto-execute section
Hotkey(f_Hotkey, f_DisplayMenu)

; Navigate to the chosen path
f_Navigate(A_ThisMenuItem := "", A_ThisMenuItemPos := "", MyMenu := "", *)
{
    global
    ; Strip any prefix markers from the path
    f_path := RegExReplace(A_ThisMenuItem, "^[►▶→•\s]+\s*", "")
    ; Strip any custom suffix if present
    if (activeTabSuffix)
        f_path := RegExReplace(f_path, "\Q" activeTabSuffix "\E$", "")
    
    if (f_path = "")
        return

    if (f_class = "#32770") ; It's a dialog
    {
        WinActivate("ahk_id " f_window_id)
        Send("!{d}")
        Sleep(50)
        addressbar := ControlGetFocus("a")
        ControlSetText(f_path, addressbar, "a")
        ControlSend("{Enter}", addressbar, "a")
        ControlFocus("Edit1", "a")
        return
    }
    else if (f_class = "ConsoleWindowClass")
    {
        WinActivate("ahk_id " f_window_id)
        SetKeyDelay(0)
        Send("{Esc}pushd " f_path "{Enter}")
        return
    }
}

RemoveToolTip()
{
    SetTimer(RemoveToolTip, 0)
    ToolTip()
}

; Get Explorer paths
getAllExplorerPaths() {
    paths := []
    
    ; Get all CabinetWClass windows
    explorerHwnds := WinGetList("ahk_class CabinetWClass")
    
    ; Get Shell.Application once
    shell := ComObject("Shell.Application")
    
    ; IShellBrowser interface ID
    static IID_IShellBrowser := "{000214E2-0000-0000-C000-000000000046}"
    
    ; For each Explorer window
    for explorerHwnd in explorerHwnds {
        try {
            ; First get the main window path
            for window in shell.Windows {
                try {
                    if window && window.hwnd && window.hwnd = explorerHwnd {
                        path := window.Document.Folder.Self.Path
                        if path && !HasValue(paths, path)
                            paths.Push(path)
                        
                        ; Now try to get tabs
                        tabCtrl := ControlGetHwnd("ShellTabWindowClass1", explorerHwnd)
                        if tabCtrl {
                            ; Get the shell browser interface
                            shellBrowser := ComObjQuery(window, IID_IShellBrowser, IID_IShellBrowser)
                            if shellBrowser {
                                try {
                                    ; Get the tab window object
                                    tabWindow := window.Document.Application.Windows
                                    if tabWindow {
                                        ; Loop through shell windows again to find ones matching this window's tabs
                                        for tabShell in shell.Windows {
                                            try {
                                                if tabShell && tabShell.hwnd = explorerHwnd {
                                                    tabPath := tabShell.Document.Folder.Self.Path
                                                    if tabPath && !HasValue(paths, tabPath)
                                                        paths.Push(tabPath)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        break  ; Found the main window, move to next explorer
                    }
                }
            }
        }
    }
    return paths
}

; Helper function to check if value exists in array
HasValue(haystack, needle) {
    if !(IsObject(haystack))
        return false
    for index, value in haystack {
        if (value = needle)
            return true
    }
    return false
}

; Parse the XML and return an array of path objects
GetDOpusPaths()
{
    if (dopusRTPath = "") {
        return []
    }

    if !FileExist(dopusRTPath) {
        MsgBox("Directory Opus Runtime (dopusrt.exe) not found at:`n" dopusRTPath "`n`nDirectory Opus integration won't work. To enable it, set the correct path in the script configuration. Or set it to an empty string to avoid this error.", "DOpus Integration Error", "Icon!")
        return []
    }
    
    tempFile := A_Temp "\dopus_paths.xml"
    try FileDelete(tempFile)
    
    try {
        cmd := '"' dopusRTPath '" /info "' tempFile '",paths'
        RunWait(cmd,, "Hide")
        
        if !FileExist(tempFile)
            return []
        
        xmlContent := FileRead(tempFile)
        FileDelete(tempFile)
        
        ; Parse paths from XML
        paths := []
        
        ; Start after the XML declaration
        xmlContent := RegExReplace(xmlContent, "^.*?<results.*?>", "")
        
        ; Extract each path element with its attributes
        while RegExMatch(xmlContent, "s)<path([^>]*)>(.*?)</path>", &match) {
            ; Get attributes
            attrs := Map()
            RegExMatch(match[1], "lister=`"(0x[^`"]*)`"", &listerMatch)
            RegExMatch(match[1], "active_tab=`"([^`"]*)`"", &activeTabMatch)
            RegExMatch(match[1], "active_lister=`"([^`"]*)`"", &activeListerMatch)
            
            ; Create path object
            pathObj := {
                path: match[2],
                lister: listerMatch ? listerMatch[1] : "unknown",
                isActiveTab: activeTabMatch ? (activeTabMatch[1] = "1") : false,
                isActiveLister: activeListerMatch ? (activeListerMatch[1] = "1") : false
            }
            paths.Push(pathObj)
            
            ; Remove the processed path element and continue searching
            xmlContent := SubStr(xmlContent, match.Pos + match.Len)
        }
        
        return paths
    }
    catch as err {
        MsgBox("Error reading Directory Opus paths: " err.Message "`n`nDirectory Opus integration will be disabled.", "DOpus Integration Error", "Icon!")
        return []
    }
}

; Display the menu
f_DisplayMenu(ThisHotkey)
{
    global
    ; Detect windows with error handling
    try {
        f_window_id := WinGetID("a")
        f_class := WinGetClass("a")
    } catch as err {
        ; If we can't get window info, wait briefly and try once more
        Sleep(25)
        try {
            f_window_id := WinGetID("a")
            f_class := WinGetClass("a")
        } catch as err {
            ToolTip("Unable to detect active window")
            SetTimer(RemoveToolTip, 1000)
            return
        }
    }

    ; Verify we got valid window info
    if (!f_window_id || !f_class) {
        ToolTip("No valid window detected")
        SetTimer(RemoveToolTip, 1000)
        return
    }

    ; Don't display menu unless it's a dialog or console window
    if !(f_class ~= "^(?i:#32770|ConsoleWindowClass)$")
        return

    CurrentLocations := Menu()
    hasItems := false
    
    ; Only get Directory Opus paths if dopusRTPath is set
    if (dopusRTPath != "") {
        ; Get paths from Directory Opus using DOpusRT
        paths := GetDOpusPaths()
        
        ; Group paths by lister
        listers := Map()
        
        ; First, group all paths by their lister
        for pathObj in paths {
            if !listers.Has(pathObj.lister)
                listers[pathObj.lister] := []
            listers[pathObj.lister].Push(pathObj)
        }
        
        ; First add paths from active lister
        for pathObj in paths {
            if (pathObj.isActiveLister) {
                CurrentLocations.Add("Opus Window " A_Index " (Active)", f_Navigate)
                CurrentLocations.Disable("Opus Window " A_Index " (Active)")
                
                ; Add all paths for this lister
                listerPaths := listers[pathObj.lister]
                for tabObj in listerPaths {
                    menuText := tabObj.path
                    ; Add prefix and suffix for active tab based on global settings
                    if (tabObj.isActiveTab)
                        menuText := activeTabPrefix menuText activeTabSuffix
                    else
                        menuText := inactiveTabPrefix menuText
                    
                    CurrentLocations.Add(menuText, f_Navigate)
                    CurrentLocations.SetIcon(menuText, A_WinDir . "\system32\imageres.dll", "4")
                    hasItems := true
                }
                
                ; Remove this lister from the map so we don't show it again
                listers.Delete(pathObj.lister)
                break
            }
        }
        
        ; Then add remaining Directory Opus listers
        windowNum := 2
        for lister, listerPaths in listers {
            CurrentLocations.Add("Opus Window " windowNum, f_Navigate)
            CurrentLocations.Disable("Opus Window " windowNum)
            
            ; Add all paths for this lister
            for pathObj in listerPaths {
                menuText := pathObj.path
                ; Add prefix and suffix for active tab based on global settings
                if (pathObj.isActiveTab)
                    menuText := activeTabPrefix menuText activeTabSuffix
                else
                    menuText := inactiveTabPrefix menuText
                    
                CurrentLocations.Add(menuText, f_Navigate)
                CurrentLocations.SetIcon(menuText, A_WinDir . "\system32\imageres.dll", "4")
                hasItems := true
            }
            
            windowNum++
        }
    }

    ; Get Explorer paths
    explorerPaths := getAllExplorerPaths()
    
    ; Add Explorer paths if any exist
    if explorerPaths.Length > 0 {
        ; Add separator if we had Directory Opus paths
        if (hasItems)
            CurrentLocations.Add()
        
        ; Add Explorer header
        CurrentLocations.Add("Windows Explorer", f_Navigate)
        CurrentLocations.Disable("Windows Explorer")
        
        ; Add Explorer paths
        for path in explorerPaths {
            menuText := inactiveTabPrefix path
            CurrentLocations.Add(menuText, f_Navigate)
            CurrentLocations.SetIcon(menuText, A_WinDir . "\system32\imageres.dll", "4")
            hasItems := true
        }
    }

    ; Show menu if we have items, otherwise show tooltip
    if (hasItems) {
        CurrentLocations.Show()
    } else {
        ToolTip("No folders open")
        SetTimer(RemoveToolTip, 1000)
    }

    ; Clean up
    CurrentLocations := ""
}
