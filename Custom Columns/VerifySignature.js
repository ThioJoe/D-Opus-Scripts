function OnInit(initData)
{
    initData.name = "Verify File Signatures";
    initData.version = "1.1";
    initData.copyright = "(c) 2024";
    initData.desc = "Column to check if file signature is valid using FastSigCheck or SignTool";
    initData.default_enable = true;
    initData.min_version = "12.23";

    // Configuration settings
    initData.config_desc = DOpus.Create().Map();
    initData.config_groups = DOpus.Create().Map();

    // Configuration for exeToolPath
    initData.config_desc("Exe_Tool_Path") = "Full path to the executable (FastSigCheck.exe or SignTool.exe)";
    initData.config.Exe_Tool_Path = "C:\\Path\\To\\Tool.exe";

    // Configuration for tool choice
    initData.config_desc("Tool_Choice") = "Choose the tool for signature check";
    initData.config.Tool_Choice = DOpus.Create.Vector(0,"SignTool", "FastSigCheck");

    // Enable Debug Logging
    initData.config_desc("Enable_Debug") = "Enable debug output for this script. Note: Doesn't output the debug from exe tools.";
    initData.config.Enable_Debug = DOpus.Create.Vector(0,"Disabled", "Enabled");

    // Limit File Types to Check
    initData.config_desc("Use_File_Types_List") = "Whether to only check filetypes in the Supported_File_Extensions list. If false, all files will be checked always.";
    initData.config.Use_File_Types_List = DOpus.Create.Vector(1,"Disabled", "Enabled");

    // Custom Column Messages
    initData.config_desc("Signature_Valid_Message") = "String to display for files that are signed with valid certificate.";
    initData.config.Signature_Valid_Message = "✔️ Signed";
    
    initData.config_desc("Signature_Invalid_Message") = "String to display for files that are signed with invalid/untrusted certificate.";
    initData.config.Signature_Invalid_Message = "⚠️ Invalid";
    
    initData.config_desc("Signature_NoSignature_Message") = "String to display for files that have no signature.";
    initData.config.Signature_NoSignature_Message = "";
    
    initData.config_desc("Signature_UnsupportedType_Message") = "String to display for files that have unsupported types for signature check.";
    initData.config.Signature_UnsupportedType_Message = "";
    
    initData.config_desc("Signature_Error_Message") = "String to display for files that encounter an error during signature check.";
    initData.config.Signature_Error_Message = "Error";

    initData.config_desc("Text_Align") = "Align text in column to left, center, or right. Note: You might need to disable & re-enable the script for this to take effect.";
    initData.config.Text_Align = DOpus.Create.Vector(0,"Left", "Center", "Right");

    // Supported File Extensions
    initData.config_desc("Supported_File_Extensions") = "List of supported file extensions";
    initData.config.Supported_File_Extensions = DOpus.Create.Vector(
        ".appx", ".appxbundle", ".arx", ".cab", ".cat", ".cbx", ".cpl", ".crx", 
        ".dbx", ".deploy", ".dll", ".doc", ".docm", ".dot", ".dotm", ".drx", 
        ".efi", ".exe", ".js", ".mpp", ".mpt", ".msi", ".msix", ".msixbundle", 
        ".msm", ".msp", ".ocx", ".pot", ".potm", ".ppa", ".ppam", ".pps", 
        ".ppsm", ".ppt", ".pptm", ".ps1", ".psi", ".psm1", ".pub", ".stl", 
        ".sys", ".vbs", ".vdw", ".vdx", ".vsd", ".vsdm", ".vsix", ".vss", 
        ".vssm", ".vst", ".vstm", ".vsx", ".vtx", ".vxd", ".wiz", ".wsf", 
        ".xap", ".xla", ".xlam", ".xls", ".xlsb", ".xlsm", ".xlt", ".xltm", 
        ".xsn"
    );

    // Group the configuration settings
    initData.config_groups("Exe_Tool_Path") = "Tool Settings";
    initData.config_groups("Tool_Choice") = "Tool Settings";
    initData.config_groups("Enable_Debug") = "Tool Settings";
    initData.config_groups("Signature_Valid_Message") = "Custom Column Messages";
    initData.config_groups("Signature_Invalid_Message") = "Custom Column Messages";
    initData.config_groups("Signature_NoSignature_Message") = "Custom Column Messages";
    initData.config_groups("Signature_UnsupportedType_Message") = "Custom Column Messages";
    initData.config_groups("Signature_Error_Message") = "Custom Column Messages";
    initData.config_groups("Supported_File_Extensions") = "Tool Settings";
    initData.config_groups("Use_File_Types_List") = "Tool Settings";
    initData.config_groups("Text_Align") = "Tool Settings";
}

function OnAddColumns(addColData)
{
    AddColumn(addColData, "VerifySignature", "Verify Signature", "verifysignature");
}

function AddColumn(addColData, colName, colLabel, checkType)
{
    var col = addColData.AddColumn();
    col.name = colName;
    col.label = colLabel;
    col.header = 'Signature';
    col.method = "OnColumns";
    col.multicol = false;
    col.autogroup = true;
    col.autorefresh = true;
    col.userdata = checkType;
    col.namerefresh = true; // Refresh the name after each change
    
    switch (Script.config.Text_Align)
    {
        case 0:
            col.justify = "left";
            break;
        case 1:
            col.justify = "center";
            break;
        case 2:
            col.justify = "right";
            break;
        default:
            col.justify = "left"; // Default to left if configuration is not set correctly
            break;
    }
}

function OnColumns(scriptColData)
{
    try
    {
        var item = scriptColData.item;
        if (item.is_dir) return;

        var enable_debug = Script.config.Enable_Debug;

        if (enable_debug === 1) DOpus.Output("Processing item: " + item.realpath);
        
        var fileExtension = item.ext.toLowerCase();
        var supportedExtensions = DOpus.Create().StringSet();
        supportedExtensions.assign(Script.config.Supported_File_Extensions);

        if (Script.config.Use_File_Types_List === 1 && !supportedExtensions.exists(fileExtension))
        {
            scriptColData.value = Script.config.Signature_UnsupportedType_Message;
            if (enable_debug === 1) DOpus.Output("File extension not in supported list, skipping: " + fileExtension);
            return;
        }

        var toolChoiceIndex = Script.config.Tool_Choice;
        var exeToolPath = Script.config.Exe_Tool_Path;
        var cmd;

        if (toolChoiceIndex === 1) {
            cmd = '"' + exeToolPath + '" "' + item.realpath + '"';
        } else if (toolChoiceIndex === 0) {
            cmd = '"' + exeToolPath + '" verify /pa /q "' + item.realpath + '"';
        } else {
            scriptColData.value = "Error: Invalid tool choice: " + toolChoice;
            return;
        }

        if (enable_debug === 1) DOpus.Output("Command: " + cmd);

        var shell = new ActiveXObject("WScript.Shell");

        var exitCode = shell.Run(cmd, 0, true);
        if (enable_debug === 1) DOpus.Output("Executed command, exit code: " + exitCode);

        switch (exitCode)
        {
            // Valid Signature
            case 0:
                scriptColData.value = Script.config.Signature_Valid_Message;
                break;
            // No Signature. If using SignTool, this could mean any invalid signature.
            case 1:
                scriptColData.value = Script.config.Signature_NoSignature_Message;
                break;
            // Signed but invalid
            case 2:
                scriptColData.value = Script.config.Signature_Invalid_Message;
                break;
            // Unsupported file type for checking signature
            case 3:
                scriptColData.value = Script.config.Signature_UnsupportedType_Message;
                break;
            // Other error
            default:
                scriptColData.value = Script.config.Signature_Error_Message;
                break;
        }
    }
    catch (e)
    {
        scriptColData.value = "Error";
        DOpus.Output("Exception: " + e.message);
    }
}
