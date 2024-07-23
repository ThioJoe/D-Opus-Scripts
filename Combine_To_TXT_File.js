// User command to combine selected files into a single text file with several options
function OnClick(clickData) {
    var dlg = clickData.func.Dlg;
    dlg.window = clickData.func.sourcetab;
    dlg.title = "Concatenate Text Files";
    dlg.message = "Choose sorting option mode and options.";
    dlg.buttons = "Name|Date|Name Reverse|Date Reverse|Directory Structure|Cancel";
    dlg.icon = "question";
    
    // Add checkbox options
    dlg.options[0].label = "Exclude file divider headers in combined file.";
    dlg.options[0].state = false;
    dlg.options[1].label = "Use relative path for headers instead of just file name.";
    dlg.options[1].state = false;
    dlg.options[2].label = "Hide file extensions in headers";
    dlg.options[2].state = false;
    dlg.options[3].label = "[Debug] Sorting debug mode (only print headers, no file contents)";
    dlg.options[3].state = false;
    
    var result = dlg.Show();

    if (result == 0) {
        return; // Cancel button clicked
    }
    var sortOption = result; // 1: Name, 2: Date, 3: Name Reverse, 4: Date Reverse, 5: Directory Structure
    var excludeHeaders = dlg.options[0].state;
    var useRelativePath = dlg.options[1].state;
    var hideExtensions = dlg.options[2].state;
    var debugMode = dlg.options[3].state;
    
    var selectedFiles = clickData.func.sourcetab.selected_files;
    if (selectedFiles.count == 0) {
        DOpus.Output("No files selected");
        return;
    }
    var filesArray = [];
    var e = new Enumerator(selectedFiles);
    for (; !e.atEnd(); e.moveNext()) {
        var item = e.item();
        filesArray.push({
            name: item.name,
            path: item.realpath,
            date: item.modify,
            relativePath: getRelativePath(item, clickData.func.sourcetab.path)
        });
    }
    
    // Sort the files based on the selected option
    sortFiles(filesArray, sortOption, clickData.func.sourcetab.path);
    
    var outputPath = clickData.func.sourcetab.path;
    var baseFileName = debugMode ? "DebugSortedList" : "CombinedTextFile";
    var outputFileName = baseFileName + ".txt";
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    // Check if file exists and append numbers to avoid overwriting
    var i = 1;
    while (fso.FileExists(outputPath + "\\" + outputFileName)) {
        outputFileName = baseFileName + "_" + i + ".txt";
        i++;
    }
    
    var outputFilePath = outputPath + "\\" + outputFileName;

    // Initialize the Progress object
    var progress = clickData.func.command.progress;
    progress.abort = true;
    progress.owned = true;
    progress.delay = false;
    progress.bytes = false;
    progress.Init(clickData.func.sourcetab, debugMode ? "Generating Debug List" : "Concatenating Text Files");
    
    // Calculate total byte size of selected files (only if not in debug mode)
    var totalBytes = 0;
    if (!debugMode) {
        for (var i = 0; i < filesArray.length; i++) {
            var file = filesArray[i];
            var fileSize = fso.GetFile(file.path).Size;
            totalBytes += fileSize;
        }
    }
    
    progress.SetFiles(filesArray.length);
    progress.Show();

    var outputFile = fso.CreateTextFile(outputFilePath, true);
    var separator = "----------------------------------------";
    var bytesProcessed = 0;
    
    for (var i = 0; i < filesArray.length; i++) {
        var file = filesArray[i];
        progress.SetName(file.name);
        progress.SetType("file");
        
        var header;
        if (useRelativePath) {
            header = "\\" + file.relativePath;
            if (hideExtensions) {
                header = header.replace(/\.[^\\]*$/, '');
            }
        } else {
            header = hideExtensions ? file.name.replace(/\.[^\.]*$/, '') : file.name;
        }
        
        if (debugMode) {
            outputFile.WriteLine(header);
        } else {
            if (!excludeHeaders) {
                outputFile.WriteLine(separator + " " + header + " " + separator);
            }
            
            var inputFile = fso.OpenTextFile(file.path, 1);
            var content = inputFile.ReadAll();
            var fileSize = fso.GetFile(file.path).Size;
            inputFile.Close();

            outputFile.WriteLine(content);
            if (!excludeHeaders) {
                outputFile.WriteLine(); // Add a blank line between files
            }
            
            bytesProcessed += fileSize;
        }
        
        progress.StepFiles(1);
        if (!debugMode) {
            var progressPercent = (bytesProcessed/totalBytes)*100;
        }
        
        if (progress.GetAbortState() == "a") {
            outputFile.Close();
            fso.DeleteFile(outputFilePath);
            progress.Hide(); // Close the progress window
            return;
        }
    }
    
    outputFile.Close();
    
    progress.Hide(); // Close the progress window
    var finalDlg = clickData.func.Dlg;
    finalDlg.window = clickData.func.sourcetab;
    finalDlg.message = debugMode ? 
        "Debug list generated successfully.\nOutput file: " + outputFilePath :
        "Text files concatenated successfully.\nOutput file: " + outputFilePath;
    finalDlg.buttons = "OK";
    finalDlg.icon = "info";
    finalDlg.Show();
}

function getRelativePath(item, sourcePath) {
    var sourcePathDepth = sourcePath.Split.count;
    var relativePath = DOpus.FSUtil.NewPath();
    relativePath.set(item.realpath.Split(sourcePathDepth));
    return String(relativePath);
}

function sortFiles(filesArray, sortOption, sourcePath) {
    switch (sortOption) {
        case 1: // Name
            filesArray.sort(function(a, b) {
                return a.name.localeCompare(b.name);
            });
            break;
        case 2: // Date
            filesArray.sort(function(a, b) {
                return b.date.compare(a.date);
            });
            break;
        case 3: // Name Reverse
            filesArray.sort(function(a, b) {
                return b.name.localeCompare(a.name);
            });
            break;
        case 4: // Date Reverse
            filesArray.sort(function(a, b) {
                return a.date.compare(b.date);
            });
            break;
        case 5: // Directory Structure with Files First
            filesArray.sort(function(a, b) {
                var aParts = a.relativePath.split("\\");
                var bParts = b.relativePath.split("\\");
                var minDepth = Math.min(aParts.length, bParts.length);

                for (var i = 0; i < minDepth; i++) {
                    if (i === aParts.length - 1 && i === bParts.length - 1) {
                        // Both are files in the same directory
                        return aParts[i].localeCompare(bParts[i]);
                    }
                    if (i === aParts.length - 1) {
                        // a is a file, b is a directory or a file in a subdirectory
                        return -1;
                    }
                    if (i === bParts.length - 1) {
                        // b is a file, a is a directory or a file in a subdirectory
                        return 1;
                    }
                    // Compare directory names
                    var comp = aParts[i].localeCompare(bParts[i]);
                    if (comp !== 0) return comp;
                }

                // If we get here, one path is a subset of the other
                return aParts.length - bParts.length;
            });
            break;
    }
}
