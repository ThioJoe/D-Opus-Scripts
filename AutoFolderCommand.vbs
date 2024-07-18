' Script to automatically run Directory Opus commands when entering specific paths with several options.
' Version: 1.0.0 - 7/17/24
' Author: ThioJoe (https://github.com/ThioJoe)

Option Explicit

Function OnInit(initData)
    initData.name = "Auto Commands For Specific Folders"
    initData.version = "1.0"
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
            "• Available switches: AlwaysRunEntry, AlwaysRunLeave" & vbNewLine & _
            "     -- Lets you run the entry/leave commands even when the next folder also matches the rule." & vbNewLine & _
            vbNewLine & _
            "Notes:" & vbNewLine & _
            "• <folder_path> can include wildcards (*), folder aliases, and Windows environment variables" & vbNewLine & _
            "• Lines starting with // are treated as comments. Empty lines are also ignored."
                                
                                
                                
    config_groups("FolderCommandPairs") = "1 - Folder Commands"

    ' Debug logging option
    config_desc("DebugLevel") = "Set the level of debug output"
    config.DebugLevel = DOpus.Create.Vector(0, "0 - Off (Default)", "1 - Info", "2 - Verbose", "3 - Debug", "4 - Debug Extra")
    config_groups("DebugLevel") = "2 - Options"
    
    ' Disable variable cache for debugging
    config.DisableCache = False
    config_desc("DisableCache") = "Disables using Script.Vars cache and re-parses config on every instance. You might need to enable this temporarily after changing the config."
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
    Dim result: Set result = CreateObject("Scripting.Dictionary")
    
    pairs = Split(Script.Config.FolderCommandPairs, vbNewLine)
    path = ""
    entryCommand = ""
    leaveCommand = ""
    switches = Array(False, False) ' [AlwaysRunEntry, AlwaysRunLeave]
    
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
                
                If Left(key, 4) = "path" Then
                    ' If we have a previous path, add it to the result
                    If path <> "" Then
                        result.Add path, Array(entryCommand, leaveCommand, switches)
                        DebugOutput 2, "Added pair - Path: " & path & ", EntryCommand: " & entryCommand & ", LeaveCommand: " & leaveCommand & ", Switches: AlwaysRunEntry=" & switches(0) & ", AlwaysRunLeave=" & switches(1)
                        entryCommand = ""
                        leaveCommand = ""
                        switches = Array(False, False)
                    End If
                    
                    DebugOutput 3, "Parsing path: " & line
                    path = DOpus.FSUtil.Resolve(value, "j")  ' Resolve aliases
                    DebugOutput 3, "   > Resolved Path: " & path
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
                        End If
                    Next
                Else
                    DebugOutput 3, "Ignoring unrecognized line: " & line
                End If
            Else
                DebugOutput 4, "Ignoring malformed line: " & line
            End If
        End If
    Next
    
    ' Add the last path if there is one
    If path <> "" Then
        result.Add path, Array(entryCommand, leaveCommand, switches)
        DebugOutput 2, "Added pair - Path: " & path & ", EntryCommand: " & entryCommand & ", LeaveCommand: " & leaveCommand & ", Switches: AlwaysRunEntry=" & switches(0) & ", AlwaysRunLeave=" & switches(1)
    End If
    
    ' Cache the result
    Script.vars.Set "CachedFolderCommandPairs", result
    
    Set ParseFolderCommandPairs = result

    DebugOutput 2, "----------- END PARSE CONFIGS -----------"
End Function

Function TerminatePath(p)
    TerminatePath = p

    If (Len(TerminatePath) > 0) Then
        Dim c, pathType, slashToUse
        c = Right(TerminatePath, 1)
        pathType = DOpus.FSUtil.PathType(TerminatePath)
        
        If pathType = "ftp" Then
            slashToUse = "/"
        Else
            slashToUse = "\"
        End If

        If (c <> "\" And c <> "/" And c <> "*" And c <> "?") Then
            TerminatePath = TerminatePath & slashToUse
        ElseIf (c = "\" Or c = "/") And c <> slashToUse Then
            ' Replace the existing slash if it's the wrong type
            TerminatePath = Left(TerminatePath, Len(TerminatePath) - 1) & slashToUse
        End If
    End If

    DebugOutput 4, "TerminatePath: Input = " & p & ", Output = " & TerminatePath
End Function

Sub CheckAndExecuteLeaveCommands(oldPath, newPath, sourceTab)
    Dim fsu, folderPattern, commandArray
    Set fsu = DOpus.FSUtil

    Dim folderCommandPairs: Set folderCommandPairs = ParseFolderCommandPairs()
    Dim leaveCommands: Set leaveCommands = CreateObject("Scripting.Dictionary")
    
	DebugOutput 3, "*****************************************************"
    'DebugOutput 3, "------------------------------------------"
    DebugOutput 3, "Testing For Leave Commands:"
    
    For Each folderPattern In folderCommandPairs.Keys
        Dim wildPath: Set wildPath = fsu.NewWild(TerminatePath(folderPattern), "d")
        DebugOutput 3, "- Checking With Pattern: " & folderPattern
        
        commandArray = folderCommandPairs(folderPattern)
        Dim alwaysRunLeave: alwaysRunLeave = commandArray(2)(1)
		DebugOutput 3, "  alwaysRunLeave: " & alwaysRunLeave
        
        ' Check for leaving a matched folder
        If wildPath.Match(oldPath) Then
            DebugOutput 3, "    > Match Found For Old Path -- " & oldPath
            
            Dim shouldRunLeaveCommand: shouldRunLeaveCommand = False
            
            If newPath = "" Then
                DebugOutput 3, "    > New path is empty, will queue leave command"
                shouldRunLeaveCommand = True
            ElseIf Not wildPath.Match(newPath) Then
                DebugOutput 3, "    > No Match For New Path, queuing leave command -- " & newPath
                shouldRunLeaveCommand = True
            ElseIf alwaysRunLeave Then
                DebugOutput 3, "    > New Path matched so leave command wouldn't have been queued, but queuing anyway because AlwaysRunLeave is True"
                shouldRunLeaveCommand = True
            Else
                DebugOutput 3, "    > Match found for new path and AlwaysRunLeave is False, not queuing leave command: " & newPath
            End If
            
            If shouldRunLeaveCommand Then
                If commandArray(1) <> "" Then
                    DebugOutput 3, "Queuing leave command for path: " & folderPattern
                    leaveCommands.Add folderPattern, commandArray(1)
                Else
                    DebugOutput 3, "Tried to run leave command, but no leave command set for pattern: " & folderPattern
                End If
            End If
        Else
            DebugOutput 3, "    > No match for oldPath, not queuing leave command"
        End If
    Next

    ' Execute leave commands
    For Each folderPattern In leaveCommands.Keys
		DebugOutput 3, "------------------------------------------"
        DebugOutput 2, "Running leave command for path: " & folderPattern
        DebugOutput 2, "   Leave command: " & leaveCommands(folderPattern)
        
        Dim leaveCmd
        Set leaveCmd = DOpus.Create.Command
        leaveCmd.SetSourceTab sourceTab
        leaveCmd.RunCommand leaveCommands(folderPattern)
    Next
End Sub

Sub QueueEntryCommands(oldPath, newPath)
    Dim fsu, folderPattern, commandArray
    Set fsu = DOpus.FSUtil

    Dim folderCommandPairs: Set folderCommandPairs = ParseFolderCommandPairs()
    Dim enterCommands: Set enterCommands = CreateObject("Scripting.Dictionary")
    
    DebugOutput 3, "*****************************************************"
    DebugOutput 3, "Testing For Entry Commands: "
    
    For Each folderPattern In folderCommandPairs.Keys
        Dim wildPath: Set wildPath = fsu.NewWild(TerminatePath(folderPattern), "d")
        DebugOutput 3, "- Checking With Pattern: " & folderPattern
        
        commandArray = folderCommandPairs(folderPattern)
        Dim alwaysRunEntry: alwaysRunEntry = commandArray(2)(0)
		DebugOutput 3, "  alwaysRunEntry: " & alwaysRunEntry
        
        Dim shouldQueueCommand
        shouldQueueCommand = False
        
        ' Check for entering a matched folder
        If wildPath.Match(newPath) Then
            DebugOutput 3, "    > Match Found For New Path -- " & newPath
            
            If oldPath = "" Then
                DebugOutput 3, "oldPath is empty - No need to check if still inside rule match, will queue entry command"
                shouldQueueCommand = True
            ElseIf Not wildPath.Match(oldPath) Then
                DebugOutput 3, "    > No Match For Old Path, queuing command -- " & oldPath
                shouldQueueCommand = True
            ElseIf alwaysRunEntry Then
                DebugOutput 3, "    > Old path matched so entry command would not have been queued, but queuing anyway because AlwaysRunEntry is True"
                shouldQueueCommand = True
            Else
                DebugOutput 3, "    > Match Found For Old Path and AlwaysRunEntry is False, not queuing entry command -- " & oldPath
            End If
        Else
            DebugOutput 3, "    > No Match For New Path, not queuing entry command -- " & newPath
        End If
        
        ' Queue entry command if applicable
        If shouldQueueCommand Then
            If commandArray(0) <> "" Then
                DebugOutput 3, "Queuing entry command for path: " & folderPattern
                enterCommands.Add folderPattern, commandArray(0)
            Else
                DebugOutput 3, "Tried to run entry command, but no entry command set for pattern: " & folderPattern
            End If
        End If
    Next

    ' Store enter commands in Script.vars for later execution
    Script.vars.Set "PendingEntryCommands", enterCommands
End Sub

Sub ExecuteQueuedEntryCommands(sourceTab)
    If Script.vars.Exists("PendingEntryCommands") Then
        Dim enterCommands: Set enterCommands = Script.vars.Get("PendingEntryCommands")
        
        ' Check if enterCommands is not empty
        If enterCommands.Count > 0 Then
			DebugOutput 3, "------------------------------------------"
            ' Execute entry commands
            Dim folderPattern
            For Each folderPattern In enterCommands.Keys
                DebugOutput 2, "Running entry command for path: " & folderPattern
                DebugOutput 2, "   Entry command: " & enterCommands(folderPattern)
                
                Dim enterCmd
                Set enterCmd = DOpus.Create.Command
                enterCmd.SetSourceTab sourceTab
                enterCmd.RunCommand enterCommands(folderPattern)
            Next

            ' Clear pending entry commands
            Script.vars.Delete "PendingEntryCommands"
        Else
            DebugOutput 3, "OnAfterFolderChange - No entry commands were run. (PendingEntryCommands was empty)"
        End If
    Else
        DebugOutput 3, "OnAfterFolderChange - No entry commands were run. (PendingEntryCommands was not set)"
    End If
End Sub

Function OnBeforeFolderChange(beforeFolderChangeData)
    If Script.config.DebugLevel >= 2 Then
        DOpus.Output "=====================================  Folder Change ====================================="
    End If
    
    Dim currentPath, newPath
    currentPath = TerminatePath(beforeFolderChangeData.tab.path)
    newPath = TerminatePath(beforeFolderChangeData.path)

    DebugOutput 2, "OnBeforeFolderChange - Current path : " & currentPath
    DebugOutput 2, "OnBeforeFolderChange - New path     : " & newPath

    ' Execute leave commands
    DebugOutput 2, "------------------------------------------"
    CheckAndExecuteLeaveCommands currentPath, newPath, beforeFolderChangeData.tab

    ' Queue entry commands for execution in OnAfterFolderChange
    QueueEntryCommands currentPath, newPath

    ' Allow the folder change to proceed
    OnBeforeFolderChange = False
End Function

Function OnAfterFolderChange(afterFolderChangeData)
    If Not afterFolderChangeData.result Then
        DebugOutput 2, "Folder change failed, not executing entry commands"
        Exit Function
    End If

    ExecuteQueuedEntryCommands afterFolderChangeData.tab
End Function

Function OnActivateTab(activateTabData)
    If Script.config.DebugLevel >= 2 Then
        DOpus.Output "===================================== Tab Activation ====================================="
    End If
    
    Dim oldPath, newPath
    
    If Not activateTabData.oldtab Is Nothing Then
        oldPath = TerminatePath(activateTabData.oldtab.Path)
    Else
        oldPath = ""
    End If
    
    If Not activateTabData.newtab Is Nothing Then
        newPath = TerminatePath(activateTabData.newtab.Path)
    Else
        newPath = ""
    End If

    DebugOutput 2, "OnActivateTab - Old path: " & oldPath
    DebugOutput 2, "OnActivateTab - New path: " & newPath

    ' Execute leave commands
    CheckAndExecuteLeaveCommands oldPath, newPath, activateTabData.oldtab

    ' Queue and execute entry commands immediately for tab activation
    QueueEntryCommands oldPath, newPath
    ExecuteQueuedEntryCommands activateTabData.newtab
End Function