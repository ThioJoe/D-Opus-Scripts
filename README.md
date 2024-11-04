# Various Scripts for Directory Opus

### Script Types:
**User Command Scripts:** Add these by going to the Customize menu > User Commands > New, and then set the "Type" to "Script Function", and "Script Type" to either VBScript or JScript depending. Don't forget to copy the template from the script comments into the template box.

**Custom Columns:** Scripts that add a new type of column you can add to any lister. These can be added by just dragging the script file into the "Script Management" menu.

**Script Add-Ins:** These can be added by just dragging the script file into the "Script Management" menu

-----

## User Command Scripts

- **Create_Bak_Button:** Creates '.bak' backups for any number of selected files. If a .bak already exists for a file, it will create .bak2, .bak3 and so on.

- **Copy_File_Names_Auto_Quoted:** Copies selected files or folders _names_ to clipboard with quotes around it only if it has spaces. Various optional behavior for multiple selected items

- **Copy_File_Paths_Auto_Quoted:** Copies selected files or folders _full paths_ to clipboard with quotes around it only if it has spaces. Various optional behavior for multiple selected items.

- **Copy_Relative_Paths:** Copy the list of paths to selected files/folders, relative to current path (such as when using flat view)

- **Copy_Tree_Structure:** This script copies a tree view of selected files and folders to the clipboard, offering customization options for branching characters, folder prefixes, sorting, and depth expansion.

- **Edit_Alternate_Data_Streams:** Use as a button to edit the alternate data streams of a selected file using the text editor of your choice.

## Script Add-Ins

- **AutoFolderCommand.vbs:** Allows running specific commands when entering or leaving specific folder paths, with several options.

- **SplitViewArrow:** (Work in Progress) Dynamically sets the lister background with an arrow image pointing from the source to the destination in dual lister view, to easily identify which is the destination/source side for operations.

## Custom Columns

- **BlankSpacerColumn:** This script adds a blank spacer column to the Directory Opus lister, improving visual organization.

- **FullShortcutTargetColumn.vbs:** This script adds a column that displays the full target path for shortcuts (.lnk files), including arguments.

- **VerifySignature:** Adds a column that shows the digital signature status of files using either FastSigCheck or SignTool.

## Other Tools/Scripts

- **ExplorerDialogPathSelector.ahk:** Autohotkey V2 Script that lets you press a key (default middle mouse) within an Explorer Save/Open dialog window, and it will show a list of paths from any currently open Directory Opus and/or Windows Explorer windows.
