' Version: 2.2.1 - 9/2/24
' This add-in script is basically a column version of Copy_Shortcut_Target_With_Arguments.vbs
' It will display the full path of a shortcut (either .lnk or .url file), including arguments
Option Explicit

' The script column definition
Function OnInit(initData)
    initData.name = "Full Shortcut Target"
    initData.version = "2.0"
    initData.copyright = "ThioJoe"
    initData.desc = "Displays the target path and arguments for .lnk and .url files"
    initData.default_enable = true
    initData.min_version = "12.0"
    
    ' Add a custom column to display the target path and arguments
    Dim col
    Set col = initData.AddColumn()
    col.name = "ShortcutTargetArgs"
    col.method = "OnShortcutTargetArgs"
    col.label = "Full Target"
    col.justify = "left"
    col.autogroup = true
End Function

Function OnShortcutTargetArgs(scriptColData)
    Dim item, fs, path, fExt, shellLink
    Set item = scriptColData.item
    Set fs = CreateObject("Scripting.FileSystemObject")
    path = item.realpath
    fExt = LCase(fs.GetExtensionName(path))

    If fExt = "lnk" Then
        ' Handle .lnk files
        Set shellLink = CreateObject("Shell.Application")
        scriptColData.value = GetLnkFullPath(shellLink, fs, path)
        Set shellLink = Nothing
    ElseIf fExt = "url" Then
        scriptColData.value = GetUrlFullPath(fs, path)
    Else
        ' For other files, return empty
        scriptColData.value = ""
    End If
End Function

' Function to return the full path and arguments of a .lnk shortcut file
' Where ShellLinkObj is created via:   CreateObject("Shell.Application")
'    and 'fs' is created via: CreateObject("Scripting.FileSystemObject")
Function GetLnkFullPath(shellLinkObj, fs, path)
    Dim linkData, targetPath, arguments
    Set linkData = shellLinkObj.Namespace(fs.GetParentFolderName(path)).ParseName(fs.GetFileName(path)).GetLink
    targetPath = linkData.Target.Path
    arguments = linkData.Arguments
    If targetPath <> "" Then
        GetLnkFullpath = Trim(targetPath & " " & arguments)
    Else
        GetLnkFullpath = Trim(path) ' Fallback to original path
    End If
End Function

' Function to read text from .url file to get URL target.
' Where 'path' is the .url file path and 'fs' is created via: CreateObject("Scripting.FileSystemObject")
Function GetUrlFullPath(fs, path)
    Dim urlFile, url
    Set urlFile = fs.OpenTextFile(path, 1) ' 1 = ForReading
    Do Until urlFile.AtEndOfStream
        url = urlFile.ReadLine
        If Left(LCase(url), 4) = "url=" Then
            GetUrlFullPath = Mid(url, 5)
            Exit Do
        End If
    Loop
    urlFile.Close
End Function
