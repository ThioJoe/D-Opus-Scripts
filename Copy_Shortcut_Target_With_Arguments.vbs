'Version: 1.0.1 - 7/1/24
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
        fExt = fs.GetExtensionName(path)
        
        If UCase(fExt) = "LNK" Then
            Set oSHLink = WShell.CreateShortcut(path)
            targetPath = oSHLink.TargetPath
            arguments = oSHLink.Arguments
            resolvedPaths = resolvedPaths & targetPath & " " & arguments
        Else
            resolvedPaths = resolvedPaths & path
        End If
        
        itemIndex = itemIndex + 1
    Next

    ' Copy the resolved paths to the clipboard
    DOpus.SetClip resolvedPaths
    
    Set oSHLink = Nothing
    Set fs = Nothing
    Set WShell = Nothing
End Function
