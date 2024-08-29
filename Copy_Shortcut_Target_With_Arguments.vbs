'Version: 2.0.0 - 8/28/24
'IMPORTANT PERFORMANCE TIP: Use the "@runonce:" command modifier if using this with a context menu button
'Just put it before whatever name you set for the user command. So for example:    @runonce:Copy_Shortcut_Target_With_Arguments

Option Explicit

Function OnClick(ByRef clickData)
    Dim fs, selectedItems, item, path, fExt, resolvedPaths, itemIndex
    Set fs = CreateObject("Scripting.FileSystemObject")
	Dim shellLink
	Set shellLink = CreateObject("Shell.Application")

    resolvedPaths = ""
    Set selectedItems = clickData.func.sourcetab.selected
	clickData.func.command.deselect = false

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
                    resolvedPaths = resolvedPaths & Trim(targetPath & " " & arguments)
                Else
                    resolvedPaths = resolvedPaths & path ' Fallback to original path
                End If

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

    Set shellLink = Nothing
    DOpus.SetClip Trim(resolvedPaths)
    'DOpus.Output "Resolved paths: " & resolvedPaths

    Set fs = Nothing
End Function
