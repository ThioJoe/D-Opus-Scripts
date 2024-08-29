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
    Dim item, fs, path, fExt, shellLink, folder, link, targetPath, arguments
    Set item = scriptColData.item
    Set fs = CreateObject("Scripting.FileSystemObject")
    path = item.realpath
    fExt = LCase(fs.GetExtensionName(path))

    If fExt = "lnk" Then
        ' Handle .lnk files
        Set shellLink = CreateObject("Shell.Application").Namespace(fs.GetParentFolderName(path)).ParseName(fs.GetFileName(path)).GetLink
        targetPath = shellLink.Target.Path
        arguments = shellLink.Arguments
        scriptColData.value = targetPath & " " & arguments
        Set shellLink = Nothing
    ElseIf fExt = "url" Then
        ' Handle .url files
        Dim urlFile, line
        Set urlFile = fs.OpenTextFile(path, 1) ' 1 = ForReading
        Do Until urlFile.AtEndOfStream
            line = urlFile.ReadLine
            If LCase(Left(line, 4)) = "url=" Then
                scriptColData.value = Trim(Mid(line, 5))
                Exit Do
            End If
        Loop
        urlFile.Close
    Else
        ' For other files, return empty or original path
        scriptColData.value = ""
    End If
End Function
