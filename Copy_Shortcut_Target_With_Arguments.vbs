'Version: 1.1.0 - 7/22/24
Option Explicit
Function OnClick(ByRef clickData)
    Dim WShell, fs, selectedItems, item, path, fExt, oSHLink, targetPath, arguments, resolvedPaths, itemIndex
    Set WShell = CreateObject("WScript.Shell")
    Set fs = CreateObject("Scripting.FileSystemObject")
    resolvedPaths = ""
    Set selectedItems = clickData.func.sourcetab.selected
    
    If selectedItems.count = 0 Then
        DOpus.Output "No files selected."
        Exit Function
    End If
    
    itemIndex = 0
    For Each item In selectedItems
        If itemIndex > 0 Then
            ' Add newline character for each subsequent item added
            resolvedPaths = resolvedPaths & vbCrLf
        End If
        
        path = item.realpath
        fExt = LCase(fs.GetExtensionName(path))
        
        Select Case fExt
            Case "lnk"
                Set oSHLink = WShell.CreateShortcut(path)
                targetPath = oSHLink.TargetPath
                arguments = oSHLink.Arguments
                resolvedPaths = resolvedPaths & targetPath & " " & arguments
            Case "url"
                Dim urlFile, url
                Set urlFile = fs.OpenTextFile(path, 1) ' 1 = ForReading
                Do Until urlFile.AtEndOfStream
                    url = urlFile.ReadLine
                    If Left(LCase(url), 4) = "url=" Then
                        resolvedPaths = resolvedPaths & Mid(url, 5)
                        Exit Do
                    End If
                Loop
                urlFile.Close
            Case Else
                resolvedPaths = resolvedPaths & path
        End Select
        
        itemIndex = itemIndex + 1
    Next
    ' Copy the resolved paths to the clipboard
    DOpus.SetClip resolvedPaths
    
    Set oSHLink = Nothing
    Set fs = Nothing
    Set WShell = Nothing
End Function
