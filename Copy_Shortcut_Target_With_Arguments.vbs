'Version: 2.2.0 - 8/31/24
'IMPORTANT PERFORMANCE TIP: Use the "@runonce:" command modifier if using this with a context menu button
'Just put it before whatever name you set for the user command. So for example:    @runonce:Copy_Shortcut_Target_With_Arguments

'   Arguments Template (Must put this in the 'Template' box in the command editor to use arguments):
'   PARSE_SHELL_ID/S
Option Explicit

Function OnClick(ByRef clickData)
    ' ------------------------ Options ------------------------
    ' Argument: PARSE_SHELL_ID (switch, no value given)
    ' Instead of copying the entire string, if the path contains "shell:", "shell:::", or starts with "::", it will only copy what comes after those points
    '----------------------------------------------------------
    
    Dim GetCLSID
    GetCLSID = False 'Default to false unless switch argument is given. Tries to parse CLSID.
    
    If clickData.func.args.got_arg.PARSE_SHELL_ID Then
        GetCLSID = True
    End If

    Dim fs, selectedItems, item, path, fExt, resolvedPaths, itemIndex
    Set fs = CreateObject("Scripting.FileSystemObject")
    Dim shellLink
    Set shellLink = CreateObject("Shell.Application")
    resolvedPaths = ""
    Set selectedItems = clickData.func.sourcetab.selected
    clickData.func.command.deselect = False
    If selectedItems.count = 0 Then
        'DOpus.Output "No files selected."
        Exit Function
    End If
    itemIndex = 0
    For Each item In selectedItems
        If itemIndex > 0 Then
            resolvedPaths = resolvedPaths & vbCrLf
        End If
        path = item.realpath
        fExt = LCase(fs.GetExtensionName(path))
        Dim resolvedPath
        Select Case fExt
            Case "lnk"
                Dim linkData, targetPath, arguments
                Set linkData = shellLink.Namespace(fs.GetParentFolderName(path)).ParseName(fs.GetFileName(path)).GetLink
                targetPath = linkData.Target.Path
                arguments = linkData.Arguments
                'DOpus.Output "Processing: " & path
                'DOpus.Output "Target: " & targetPath
                'DOpus.Output "Arguments: " & arguments
                If targetPath <> "" Then
                    resolvedPath = Trim(targetPath & " " & arguments)
                Else
                    resolvedPath = path ' Fallback to original path
                End If
            Case "url"
                Dim urlFile, url
                Set urlFile = fs.OpenTextFile(path, 1) ' 1 = ForReading
                Do Until urlFile.AtEndOfStream
                    url = urlFile.ReadLine
                    If Left(LCase(url), 4) = "url=" Then
                        resolvedPath = Mid(url, 5)
                        Exit Do
                    End If
                Loop
                urlFile.Close
            Case Else
                resolvedPath = path
        End Select
        
        If GetCLSID Then
            resolvedPath = parseCLSID(resolvedPath)
        End If
        
        resolvedPaths = resolvedPaths & resolvedPath
        itemIndex = itemIndex + 1
    Next
    Set shellLink = Nothing
    
    DOpus.SetClip Trim(resolvedPaths)
    DOpus.Output "Resolved paths: " & resolvedPaths
    Set fs = Nothing
End Function

Function parseCLSID(path)
    If Left(path, 2) = "::" Then
        ' Case 1 and 2: Starts with "::"
        parseCLSID = Mid(path, 3)
    ElseIf InStr(path, "shell:::") > 0 Then
        ' Case 3: Contains "shell:::"
        parseCLSID = Mid(path, InStr(path, "shell:::") + 8)
    ElseIf InStr(path, "shell:") > 0 Then
        ' Case 4: Contains "shell:"
        parseCLSID = Mid(path, InStr(path, "shell:") + 6)
    Else
        ' No CLSID found, keep the original path
        parseCLSID = path
    End If
End Function
