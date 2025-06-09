' Script to automatically run Directory Opus commands when entering specific paths with several options.
' Version: 1.2.0 - 6/8/25
' Author: ThioJoe (https://github.com/ThioJoe)
'
' Available at GitHub repo: https://github.com/ThioJoe/D-Opus-Scripts
' Forum Thread: https://resource.dopus.com/t/script-for-running-various-commands-when-entering-specific-paths/51839

Option Explicit

Function OnInit(initData)
    initData.name = "Auto Commands For Specific Folders"
    initData.version = "1.1.2"
    initData.desc = "Automatically run specified commands when entering or leaving configured folders."
    initData.default_enable = true
    initData.min_version = "13.0"

    ' Configuration settings
    Dim config: Set config = initData.config
    Dim config_desc: Set config_desc = DOpus.Create.Map
    Dim config_groups: Set config_groups = DOpus.Create.Map

    ' FolderCommandPairs configuration
    config.FolderCommandPairs = "Path1 = C:\SomeExample\*\Path" & vbNewLine & _
                                "EntryCommand1 = Toolbar Example_Toolbar_Name" & vbNewLine & _
                                "LeaveCommand1 = Toolbar Example_Toolbar_Name CLOSE" & vbNewLine & _
                                "Switches1 = AlwaysRunLeave, AlwaysRunEntry"

    config_desc("FolderCommandPairs") = _
            "Enter path-command pairs, one per line. Use the following format:" & vbNewLine & _
            "     PathX = <folder_path>" & vbNewLine & _
            "     EntryCommandX = command_to_run_on_entry>" & vbNewLine & _
            "     LeaveCommandX = <command_to_run_on_leave>" & vbNewLine & _
            "     SwitchesX = <comma_separated_switches>" & vbNewLine & _
            vbNewLine & _
            "Where:" & vbNewLine & _
            "• X is a number (1, 2, 3, etc.) to group related commands" & vbNewLine & _
            "• Available switches: AlwaysRunEntry, AlwaysRunLeave, DontResolvePath" & vbNewLine & _
            "     -- AlwaysRunEntry, AlwaysRunLeave: Lets you run the entry/leave commands even when the next folder also matches the rule." & vbNewLine & _
            "     -- DontResolvePath: The given path will not be resolved before being checked against the lister path. May be necessary for paths like lib:// which would be re-written as C:\Users\... and therefore might not match when expected" & vbNewLine & _
            vbNewLine & _
            "Notes:" & vbNewLine & _
            "• <folder_path> can include wildcards (*), folder aliases, and Windows environment variables" & vbNewLine & _
            "• Commands can even include built-in Opus function arguments like {sourcepath}" & vbNewLine & _
            "• Lines starting with // are treated as comments. Empty lines are also ignored."

    config_groups("FolderCommandPairs") = "1 - Folder Commands"

    ' Debug logging option
    config_desc("DebugLevel") = "Set the level of debug output"
    config.DebugLevel = DOpus.Create.Vector(0, "0 - Off (Default)", "1 - Info", "2 - Verbose", "3 - Debug", "4 - Debug Extra")
    config_groups("DebugLevel") = "2 - Options"
    
    ' Disable variable cache for debugging
    config.DisableCache = False
    config_desc("DisableCache") = "Disables using Script.Vars cache and re-parses config on every instance. Only meant for debugging."
    config_groups("DisableCache") = "2 - Options"

    initData.config_desc = config_desc
    initData.config_groups = config_groups
End Function

Sub DebugOutput(level, message)   
    If Script.config.DebugLevel >= level Then
        Dim levelString
        Select Case level
            Case 1
                levelString = "[Info]       | "
            Case 2
                levelString = "[Verbose]    | "
            Case 3
                levelString = "[Debug]      | "
            Case 4
                levelString = "[DebugExtra] | "
            Case Else
                levelString = "[Log]        | "
        End Select
        
        DOpus.Output levelString & message
    End If
End Sub

' Data Structure Explanation: 
' The script parses the user configuration into a 'Map' object (like a dictionary), with the structure described below.
' 
'     1. It is initially created in the function 'ParseFolderCommandPairs()' and named 'result' by parsing the user config in ParseFolderCommandPairs, 
'           and paths are further processed/resolved, and so the data is put into another intermediate version called 'resolvedResult'
'     2. At the end of ParseFolderCommandPairs(), resolvedResult is cached into script.vars as "CachedFolderCommandPairs", and returned from the function
'     3. Whenever changing directories, ParseFolderCommandPairs() is called by various event handlers to return the Map. 
'           The cache will be used if available to avoid re-running all the logic.
'     4. The returned Map is assigned to folderCommandPairs, and the path is checked against each key in the Map
'           When looping the paths to check, in each iteration the 2D vector (array) is assigned as commandArray
'
' ---- Structure of the primary Map storing path and command info (aka result, resolvedResult, CachedFolderCommandPairs, folderCommandPairs) ----
'
'   Key: (String) The folder path pattern to match.
'   |
'   --- Value: (Vector) A Vector containing 3 items.
'       |
'       --- [0]: (String) The command to run on folder entry.
'       |
'       --- [1]: (String) The command to run on folder leave.
'       |
'       --- [2]: (Vector) A nested Vector containing the 3 boolean switch states.
'           |
'           --- [0]: (Boolean) AlwaysRunEntry
'           |
'           --- [1]: (Boolean) AlwaysRunLeave
'           |
'           --- [2]: (Boolean) DontResolvePath
'       |
'       --- [3]: (Wild) Wildcard object for pattern matching the path

Function ParseFolderCommandPairs()
    ' Check if we have cached folder command pairs and if caching is not disabled
    If Not Script.config.DisableCache And Script.vars.Exists("CachedFolderCommandPairs") Then
        DebugOutput 4, "------------------------------------------"
        DebugOutput 4, "ParseFolderCommandPairs(): Using cached folder command pairs"
        Set ParseFolderCommandPairs = Script.vars.Get("CachedFolderCommandPairs")
        Exit Function
    End If
    
    DebugOutput 2, "----------- BEGIN PARSE CONFIGS -----------"

    Dim pairs, line, path, entryCommand, leaveCommand, switches
    Dim result: Set result = DOpus.Create.Map
    
    pairs = Split(Script.Config.FolderCommandPairs, vbNewLine)
    path = ""
    entryCommand = ""
    leaveCommand = ""
    
    ' Opus Vector of Bools Per Switch: [AlwaysRunEntry, AlwaysRunLeave, DontResolvePath]
    ' Using a Vector instead of VBS array because we'll eventually be storing this in script.vars, though nested within a Map
    Set switches = DOpus.Create.Vector(False, False, False) 
    
    For Each line In pairs
        line = Trim(line)
        
        ' Skip blank lines and comments
        If line = "" Or Left(line, 2) = "//" Then
            If line = "" Then
                DebugOutput 4, "Skipping blank line"
            Else
                DebugOutput 4, "Skipping comment: " & line
            End If
        Else
            Dim parts: parts = Split(line, "=", 2)
            If UBound(parts) = 1 Then
                Dim key: key = LCase(Trim(parts(0)))
                Dim value: value = Trim(parts(1))
                
                ' Check for the keywords we're looking for. 
                '   "Left" function takes parameters of the string and the number of characters to check (from the left)
                '   "Key" is the left side of the line split on the equals (=) sign which has been trimmed and converted to lowercase, and should contain the config keyword
                '   "Value" is the right side of the line split on the equals (=) sign which has been trimmed and should contain the value for that keyword

                If Left(key, 4) = "path" Then
                    ' We found a new 'path=' line, so save the accumulated commands for the current path before moving on and starting a new group
                    If path <> "" Then
                        result(path) = DOpus.Create.Vector(entryCommand, leaveCommand, switches)
                        DebugOutput 2, "Added pair - Path: " & path & ", EntryCommand: " & entryCommand & ", LeaveCommand: " & leaveCommand & ", Switches: AlwaysRunEntry=" & switches(0) & ", AlwaysRunLeave=" & switches(1) & ", DontResolvePath=" & switches(2)
                        ' Reset the variables for the next group
                        entryCommand = ""
                        leaveCommand = ""
                        Set switches = DOpus.Create.Vector(False, False, False)
                    End If

                    path = value  ' Store raw path, will resolve in the other loop later depending on switches

                ElseIf Left(key, 12) = "entrycommand" Then
                    DebugOutput 3, "Parsing entry command: " & line
                    entryCommand = value
                ElseIf Left(key, 12) = "leavecommand" Then
                    DebugOutput 3, "Parsing leave command: " & line
                    leaveCommand = value
                ElseIf Left(key, 8) = "switches" Then
                    DebugOutput 3, "Parsing switches: " & line
                    Dim switchList: switchList = Split(value, ",")
                    Dim switch
                    For Each switch In switchList
                        switch = Trim(LCase(switch))
                        If switch = "alwaysrunentry" Then
                            switches(0) = True
                        ElseIf switch = "alwaysrunleave" Then
                            switches(1) = True
                        ElseIf switch = "dontresolvepath" Then
                            switches(2) = True
                        Else
                            DebugOutput 3, "Ignoring unrecognized switch: " & switch
                        End If
                    Next
                Else
                    DebugOutput 3, "Ignoring unrecognized line: " & line
                End If
            Else
                DebugOutput 3, "Ignoring malformed line: " & line
            End If
        End If
    Next
    
    ' Add the last path if there is one
    If path <> "" Then
        result(path) = DOpus.Create.Vector(entryCommand, leaveCommand, switches)
        DebugOutput 2, "Added pair - Path: " & path & ", EntryCommand: " & entryCommand & ", LeaveCommand: " & leaveCommand & ", Switches: AlwaysRunEntry=" & switches(0) & ", AlwaysRunLeave=" & switches(1) & ", DontResolvePath=" & switches(2)
    End If

    ' Create a new dictionary to store resolved paths
    Dim resolvedResult: Set resolvedResult = DOpus.Create.Map
    
    ' Parse and resolve paths here after we know the switches so we can do so based on DontResolvePath switch
    '    If set to not resolve, then paths like lib:// will not be changed to the absolute drive path
    Dim pathKey
    For Each pathKey in result
        Dim pathData
        Set pathData = result(pathKey)
        Dim resolvedPath, wildPath
        
        ' Check if this path should be resolved (based on DontResolvePath switch)
        If pathData(2)(2) Then  ' switches(2) is DontResolvePath
            DebugOutput 3, "Not resolving path: " & pathKey
            resolvedPath = pathKey
        Else
            DebugOutput 3, "Resolving path: " & pathKey
            resolvedPath = DOpus.FSUtil.Resolve(pathKey, "j")
            DebugOutput 3, "   > Resolved to: " & resolvedPath
        End If
        
        ' Create the Wild object for this path
        Set wildPath = DOpus.FSUtil.NewWild(TerminatePath(resolvedPath), "d")
        
        ' Create a new vector that includes the original data plus the wildPath object
        ' Then add to the new dictionary that uses the final resolved paths
        resolvedResult(resolvedPath) = DOpus.Create.Vector(pathData(0), pathData(1), pathData(2), wildPath)
    Next
    
    ' Cache the result
    Script.vars.Set "CachedFolderCommandPairs", resolvedResult
    DebugOutput 1, "Commands parsed and cached. Total pairs: " & resolvedResult.Count
    
    Set ParseFolderCommandPairs = resolvedResult

    DebugOutput 2, "----------- END PARSE CONFIGS -----------"
End Function

Function TerminatePath(p)
    TerminatePath = p
    DebugOutput 4, "  Running TerminatePath function for path: " & p

    If (Len(TerminatePath) > 0) Then
        Dim c, pathType, slashToUse
        c = Right(TerminatePath, 1)
        pathType = DOpus.FSUtil.PathType(TerminatePath)
        
        If pathType = "ftp" Then
            slashToUse = "/"
            DebugOutput 4, "   > FTP path detected, using forward slash (/)"
        Else
            slashToUse = "\"
            DebugOutput 4, "   > Local path detected, using backslash (\)"
        End If

        If (c <> "\" And c <> "/" And c <> "*" And c <> "?") Then
            TerminatePath = TerminatePath & slashToUse
            DebugOutput 4, "   > Appending slash - Path is now: " & TerminatePath
        ElseIf (c = "\" Or c = "/") And c <> slashToUse Then
            ' Replace the existing slash if it's the wrong type
            TerminatePath = Left(TerminatePath, Len(TerminatePath) - 1) & slashToUse
            DebugOutput 4, "   > Replacing slash - Path is now: " & TerminatePath
        End If
    End If

    DebugOutput 4, "   > TerminatePath: Before = " & p & ", After = " & TerminatePath
End Function

Sub ProcessFolderChangeCommands(oldPath, newPath, oldSourceTab, newSourceTab)
    Dim folderPattern, commandArray, wildPath
    Dim folderCommandPairs: Set folderCommandPairs = ParseFolderCommandPairs()
    Dim leaveCommands: Set leaveCommands = DOpus.Create.Map
    Dim enterCommands: Set enterCommands = DOpus.Create.Map
    
    DebugOutput 3, "************** ProcessFolderChangeCommands **************"
    'DebugOutput 3, "------------------------------------------"
    DebugOutput 3, "  Old Path: " & oldPath
    DebugOutput 3, "  New Path: " & newPath

    Dim leaveCmd
    Dim enterCmd
    
    For Each folderPattern In folderCommandPairs
        DebugOutput 4, "- Checking With Pattern: " & folderPattern
        
        Set commandArray = folderCommandPairs(folderPattern)
        Set wildPath = commandArray(3)
        
        ' --- Check for LEAVE command ---
        Dim alwaysRunLeave: alwaysRunLeave = commandArray(2)(1) ' AlwaysRunLeave switch is the second element in the switches array 
        DebugOutput 4, "  alwaysRunLeave: " & alwaysRunLeave
        
        If wildPath.Match(oldPath) Then
            DebugOutput 4, "    > LEAVE: Match Found For Old Path -- " & oldPath
            
            Dim shouldRunLeaveCommand: shouldRunLeaveCommand = False
            
            If newPath = "" Then
                DebugOutput 4, "    > New path is empty, will queue leave command"
                shouldRunLeaveCommand = True
            ElseIf Not wildPath.Match(newPath) Then
                DebugOutput 4, "    > No Match For New Path, queuing leave command -- " & newPath
                shouldRunLeaveCommand = True
            ElseIf alwaysRunLeave Then
                DebugOutput 4, "    > New Path matched so leave command wouldn't have been queued, but queuing anyway because AlwaysRunLeave is True"
                shouldRunLeaveCommand = True
            Else
                DebugOutput 4, "    > Match found for new path and AlwaysRunLeave is False, not queuing leave command: " & newPath
            End If
            
            If shouldRunLeaveCommand Then
                If commandArray(1) <> "" Then
                    DebugOutput 4, "Queuing leave command for path: " & folderPattern
                    leaveCommands(folderPattern) = commandArray(1)
                Else
                    DebugOutput 4, "Tried to run leave command, but no leave command set for pattern: " & folderPattern
                End If
            End If
        Else
            DebugOutput 4, "    > LEAVE: No match for oldPath, not queuing leave command"
        End If

        ' --- Check for ENTRY command ---
        Dim alwaysRunEntry: alwaysRunEntry = commandArray(2)(0)
        DebugOutput 4, "  alwaysRunEntry: " & alwaysRunEntry
        
        Dim shouldRunEntryCommand
        shouldRunEntryCommand = False
        
        If wildPath.Match(newPath) Then
            DebugOutput 4, "    > ENTRY: Match Found For New Path -- " & newPath
            
            If oldPath = "" Then
                DebugOutput 4, "oldPath is empty - No need to check if still inside rule match, will queue entry command"
                shouldRunEntryCommand = True ' 
            ElseIf Not wildPath.Match(oldPath) Then
                DebugOutput 4, "    > No Match For Old Path, queuing command -- " & oldPath
                shouldRunEntryCommand = True
            ElseIf alwaysRunEntry Then
                DebugOutput 4, "    > Old path matched so entry command would not have been queued, but queuing anyway because AlwaysRunEntry is True"
                shouldRunEntryCommand = True
            Else
                DebugOutput 4, "    > Match Found For Old Path and AlwaysRunEntry is False, not queuing entry command -- " & oldPath
            End If
        Else
            DebugOutput 4, "    > ENTRY: No Match For New Path, not queuing entry command -- " & newPath
        End If
        
        If shouldRunEntryCommand Then
            If commandArray(0) <> "" Then
                DebugOutput 4, "Queuing entry command for path: " & folderPattern
                enterCommands(folderPattern) = commandArray(0)
            Else
                DebugOutput 4, "Tried to run entry command, but no entry command set for pattern: " & folderPattern
            End If
        End If
    Next

    ' Execute leave commands
    If leaveCommands.Count > 0 Then
        Set leaveCmd = DOpus.Create.Command

        ' Try to set the source tab specifically to the old tab for leave commands
        ' Sometimes the SetSourceTab fails for some unknown reason even if the tab is valid, so we handle that with error checking
        ' It continues anyway since the command will still run without it, but it may not have the correct source tab
        ' But it's rare enough that we can probably ignore it
        If Not IsBlank(oldSourceTab) Then
            On Error Resume Next
            leaveCmd.SetSourceTab oldSourceTab
            If Err.Number <> 0 Then
                DebugOutput 1, "A non-critical error occurred in SetSourceTab. Ignoring. (Details: " & Err.Description & ")"
                Err.Clear
            End If
            On Error GoTo 0 ' Reset error handling
        Else
            DebugOutput 3, "No previous source tab (previous tab may have closed). Using new tab instead."
        End If
        
        For Each folderPattern In leaveCommands
            DebugOutput 3, "------------------------------------------"
            DebugOutput 2, "Running leave command for path: " & folderPattern
            DebugOutput 2, "   Leave command: " & leaveCommands(folderPattern)
            
            leaveCmd.RunCommand leaveCommands(folderPattern)
        Next
    End If
    
    ' Execute entry commands
    If enterCommands.Count > 0 Then
        Set enterCmd = DOpus.Create.Command

        If Not IsBlank(newSourceTab) Then
            On Error Resume Next
            enterCmd.SetSourceTab newSourceTab
            If Err.Number <> 0 Then
                DebugOutput 1, "A non-critical error occurred in SetSourceTab. Ignoring. (Details: " & Err.Description & ")"
                Err.Clear
            End If
            On Error GoTo 0 ' Reset error handling
        End If

        For Each folderPattern In enterCommands
            DebugOutput 3, "------------------------------------------"
            DebugOutput 2, "Running entry command for path: " & folderPattern
            DebugOutput 2, "   Entry command: " & enterCommands(folderPattern)
            enterCmd.RunCommand enterCommands(folderPattern)
        Next
    Else
        DebugOutput 4, "No matching entry commands to run."
    End If
End Sub

Function OnBeforeFolderChange(beforeFolderChangeData)
    If Script.config.DebugLevel >= 2 Then
        DOpus.Output "===================================== Folder Change (OnBeforeFolderChange)  ====================================="
    End If
    
    Dim currentPath
    currentPath = TerminatePath(beforeFolderChangeData.tab.path)

    ' Just store the current path in a variable for later use. Don't do any extra processing to prevent blocking the folder change.
    Script.vars.Set "PreviousPath", currentPath
    DebugOutput 3, "OnBeforeFolderChange - Current path : " & currentPath

    ' Allow the folder change to proceed
    OnBeforeFolderChange = False
End Function

Function OnAfterFolderChange(afterFolderChangeData)
    If Script.config.DebugLevel >= 2 Then
        DOpus.Output "===================================== Folder Change (OnAfterFolderChange) ====================================="
    End If

    If Not afterFolderChangeData.result Then
        DebugOutput 2, "Folder change failed, not executing entry commands"
        Exit Function
    End If

    DebugOutput 3, "Folder change action: " & afterFolderChangeData.action

    newPath = TerminatePath(afterFolderChangeData.tab.path)

    Dim currentPath, newPath
    If Script.vars.Exists("PreviousPath") Then
        currentPath = Script.vars.Get("PreviousPath")
        DebugOutput 2, "OnAfterFolderChange - Old path: " & currentPath
    Else
        DebugOutput 2, "OnAfterFolderChange - Old path: [None]"
    End If
    
    DebugOutput 2, "OnAfterFolderChange - New path : " & newPath

    ProcessFolderChangeCommands currentPath, newPath, afterFolderChangeData.tab, afterFolderChangeData.tab

    Script.vars.Delete "PreviousPath" ' Clear the previous path after processing
End Function

' A universal function to check if a variable is empty, nothing, null, or zero.
Function IsBlank(checkVar)
    Dim varTypeName
    varTypeName = TypeName(checkVar)
    DebugOutput 4, "IsBlank called with variable of type: " & varTypeName
    
    If varTypeName = "Nothing" Then
        IsBlank = True
        DebugOutput 4, "IsBlank: Variable is Nothing"
        Exit Function
    End If

    If varTypeName = "Object" Then
        IsBlank = (checkVar Is Nothing)
    ElseIf varTypeName = "Empty" Then
        IsBlank = True
    ElseIf varTypeName = "Null" Then
        IsBlank = True
    Else
        ' For strings, numbers, booleans, etc.
        ' Treats "" and 0 as blank.
        IsBlank = (checkVar = "")
    End If
End Function

Function OnActivateTab(activateTabData)
    If Script.config.DebugLevel >= 2 Then
        DOpus.Output "===================================== Tab Activation (OnActivateTab) ====================================="
    End If
    
    Dim oldPath, newPath
   
    If Not IsBlank(activateTabData.oldtab) Then
        If Not IsBlank(activateTabData.oldtab.path) Then
            oldPath = TerminatePath(activateTabData.oldtab.Path)
        Else
            oldPath = ""
        End If
    Else
        oldPath = ""
    End If
    
    If Not activateTabData.newtab Is Nothing Then
        newPath = TerminatePath(activateTabData.newtab.Path)
    Else
        newPath = ""
    End If

    Dim oldSourceTab
    ' If the tab is closing, we use the old tab as the source for leave commands
    If activateTabData.closing Then
        Set oldSourceTab = Nothing
        DebugOutput 3, "OnActivateTab - Previous tab closed."
    ElseIf Not IsBlank(activateTabData.oldtab) Then
        Set oldSourceTab = activateTabData.oldtab
    Else
        Set oldSourceTab = Nothing
        DebugOutput 3, "OnActivateTab - No previous tab available."
    End If

    DebugOutput 2, "OnActivateTab - Old path: " & oldPath
    DebugOutput 2, "OnActivateTab - New path: " & newPath

    ' Execute leave commands and entry commands
    ProcessFolderChangeCommands oldPath, newPath, oldSourceTab, activateTabData.newtab
End Function

Function OnScriptConfigChange(scriptConfigChangeData)
    DebugOutput 1, "OnScriptConfigChange triggered - Config has changed, resetting script cache"
    
    ' Clear the cached folder command pairs to force re-parsing on next folder change
    If Script.vars.Exists("CachedFolderCommandPairs") Then
        Script.vars.Delete "CachedFolderCommandPairs"
        DebugOutput 2, "Cleared cached folder command pairs due to config change."
    End If
    
    ' Optionally, you can re-parse the config here if needed
    ParseFolderCommandPairs()
End Function
