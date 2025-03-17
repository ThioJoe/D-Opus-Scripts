// Renames tab labels in the current lister to be unique, when there are tabs for identically-named folders located in different paths
//    - It will prepend the tab names with the deepest-level part of the path necessary to uniquely identify the tab
//    - Optionally, instead of only prepending a single path part, you can prepend all relative path parts
//
// By: ThioJoe
// Updated 3/17/25

// Set the divider as desired
var divider = " … ";

// If true, only show one differentiating ancestor folder in front of the final folder.
// If false, show from the first differing folder down to the folder immediately above the final folder.
var ShowOnlySingleAncestorDiff = true;

// Polyfill to add support for trim() in older JScript versions
if (typeof String.prototype.trim !== 'function') {
    String.prototype.lTrim = function(chr){chr=chr||"\\s";return new String(this.replace(new RegExp("^"+chr+"*"),''));};
    String.prototype.rTrim = function(chr){chr=chr||"\\s";return new String(this.replace(new RegExp(chr+"*$"),''));};
    String.prototype.trim = function(chr){return this.lTrim(chr).rTrim(chr);};
}

// Called when the user clicks the button
function OnClick(clickData) {
    var lister = clickData.func.sourcetab.lister;
    var tabs = lister.tabs;

    // Group tabs by their final folder name
    var folderGroups = DOpus.Create.Map();
    for (var e = new Enumerator(tabs); !e.atEnd(); e.moveNext()) {
        var tab = e.item();
        var folderName = tab.path.filepart;

        if (!folderGroups.exists(folderName)) {
            folderGroups(folderName) = DOpus.Create.Vector();
        }
        folderGroups(folderName).push_back(tab);
    }

    // We'll store the final label for each unique path in this map:
    //   Key = path (string)
    //   Value = label (string)
    var tabNames = DOpus.Create.Map();

    // Process each group
    for (var e = new Enumerator(folderGroups); !e.atEnd(); e.moveNext()) {
        var folderName = e.item();
        var group = folderGroups(folderName);

        if (group.count === 1) {
            // Only one tab with this folder name => label is just the folder name
            tabNames(group(0).path) = folderName;
            continue;
        }

        // We have multiple tabs sharing the same final folder name.
        // 1) Remove duplicates so we only create one label per unique path.
        var uniqueTabsMap = DOpus.Create.Map();
        for (var i = 0; i < group.count; i++) {
            var t = group(i);
            if (!uniqueTabsMap.exists(t.path)) {
                uniqueTabsMap(t.path) = t;
            }
        }

        // 2) Put them in a vector so we can iterate
        var uniqueTabsVector = DOpus.Create.Vector();
        for (var ee = new Enumerator(uniqueTabsMap); !ee.atEnd(); ee.moveNext()) {
            var uniquePath = ee.item();
            uniqueTabsVector.push_back(uniqueTabsMap(uniquePath));
        }

        // 3) Assign labels based on Single vs Multi logic
        if (ShowOnlySingleAncestorDiff) {
            AssignLabelsSingleAncestor(uniqueTabsVector, tabNames, folderName);
        } else {
            AssignLabelsMultiAncestor(uniqueTabsVector, tabNames, folderName);
        }
    }

    // Finally apply these labels to all tabs
    for (var tEnum = new Enumerator(tabs); !tEnum.atEnd(); tEnum.moveNext()) {
        var tab = tEnum.item();
        var path = tab.path;
        if (tabNames.exists(path)) {
            var finalName = tabNames(path);
            if (tab.displayed_label != finalName) {
                //DOpus.Output("Renaming tab: " + path);
                //DOpus.Output("  Original: " + tab.displayed_label);
                //DOpus.Output("  New:      " + finalName);

                var cmd = clickData.func.command;
                cmd.SetSourceTab(tab);
                cmd.RunCommand("Go TABNAME=\"" + EscapeOpusArg(finalName) + "\"");
            }
        }
    }
}

//---------------------------------------------------------------------------------
// ShowOnlySingleAncestorDiff = true
// We pick exactly one ancestor folder that’s unique if possible
function AssignLabelsSingleAncestor(tabsVector, tabNames, folderName) {
    var count = tabsVector.count;
    if (count < 1) return;

    // chosenAncestors[i] holds the single differentiating ancestor for tabsVector[i]
    var chosenAncestors = [];
    var doneFlags = [];
    for (var i = 0; i < count; i++) {
        chosenAncestors.push("");
        doneFlags.push(false);
    }

    var level = 1; // how many levels above the final folder (1=immediate parent, 2=grandparent, etc.)
    while (true) {
        var stillNotDone = false;

        // For each tab not done, pick the folder name at the current 'level'
        for (var i = 0; i < count; i++) {
            if (doneFlags[i]) continue;
            var pathComps = tabsVector(i).path.Split();
            var idx = pathComps.count - 1 - level; // the 'ancestor' we're examining
            if (idx >= 0) {
                chosenAncestors[i] = pathComps(idx);
            } else {
                chosenAncestors[i] = "";  // we've gone above root
            }
        }

        // Determine how many times each chosen ancestor appears
        var ancestorCount = DOpus.Create.Map();
        for (var i = 0; i < count; i++) {
            var aKey = chosenAncestors[i].toLowerCase();
            if (!ancestorCount.exists(aKey)) {
                ancestorCount(aKey) = 0;
            }
            ancestorCount(aKey) = ancestorCount(aKey) + 1;
        }

        // Mark tabs with a unique ancestor as done
        for (var i = 0; i < count; i++) {
            if (!doneFlags[i]) {
                var aKey = chosenAncestors[i].toLowerCase();
                if (ancestorCount(aKey) === 1) {
                    doneFlags[i] = true;
                }
            }
        }

        // Check if still not done
        for (var i = 0; i < count; i++) {
            if (!doneFlags[i]) {
                stillNotDone = true;
                break;
            }
        }
        if (!stillNotDone) {
            // All done or can't get more unique
            break;
        }
        level++;
        if (level > 100) {
            // Safety stop
            break;
        }
    }

    // Assign final names
    for (var i = 0; i < count; i++) {
        var tab = tabsVector(i);
        var anc = chosenAncestors[i];
        if (anc === "") {
            // No unique difference found; label is just the final folder
            tabNames(tab.path) = folderName;
        } else {
            tabNames(tab.path) = anc + divider + folderName;
        }
    }
}

//---------------------------------------------------------------------------------
// ShowOnlySingleAncestorDiff = false
// We show from the first folder that differs among all tabs, down to the folder
// immediately above the final folder. This is done by removing the "longest common
// prefix" from all paths (except the final folder), and using whatever remains.
// e.g. "Test2\Example … MyFolder" or "Test3\Example … MyFolder"
function AssignLabelsMultiAncestor(tabsVector, tabNames, folderName) {
    var count = tabsVector.count;
    if (count < 1) return;

    // 1) Gather splitted paths
    var splittedArr = [];
    for (var i = 0; i < count; i++) {
        splittedArr.push(tabsVector(i).path.Split());
    }

    // 2) Find the longest common prefix among these paths,
    //    ignoring the final folder component in each path.
    var commonPrefixLen = findLongestCommonPrefixLength(splittedArr);

    // 3) Build label for each path by skipping that common prefix,
    //    and also skipping the final component (which is folderName).
    for (var i = 0; i < count; i++) {
        var tab = tabsVector(i);
        var comps = splittedArr[i];
        // The final folder is comps[comps.length-1].
        // So the relevant portion is comps[commonPrefixLen .. comps.length-2].
        var lastParentIndex = comps.length - 2; // the parent folder of the final
        var prefixComps = [];

        for (var c = commonPrefixLen; c <= lastParentIndex; c++) {
            if (c >= 0 && c < comps.length - 1) {
                prefixComps.push(comps[c]);
            }
        }

        var prefixStr = prefixComps.join("\\");  // use backslash as the user prefers

        if (prefixStr === "") {
            // Means there's no difference in parent path
            tabNames(tab.path) = folderName;
        } else {
            tabNames(tab.path) = prefixStr + divider + folderName;
        }
    }
}

//---------------------------------------------------------------------------------
// Find the number of leading components that are common among all paths, ignoring
// their final folder. We'll compare each path up to path.length - 1 (exclude final).
// Returns an integer prefix length (0-based).
function findLongestCommonPrefixLength(pathsArr) {
    // If there's only 1 path, the "common prefix" is all but the final folder
    // but we can just return pathsArr[0].length-1. Either approach is fine.
    if (pathsArr.length === 1) {
        return 0; // trivially no need for a prefix
    }

    // We'll compare component by component
    var minLength = 999999; // This will be updated later
    // first find the shortest path's relevant length (excluding final folder)
    for (var i = 0; i < pathsArr.length; i++) {
        var lenExcludingFinal = pathsArr[i].length - 1;
        if (lenExcludingFinal < minLength) {
            minLength = lenExcludingFinal;
        }
    }
    // minLength is the maximum possible prefix length we can compare

    var prefixLen = 0;
    while (prefixLen < minLength) {
        // Compare the prefixLen'th component of all
        var firstComp = pathsArr[0][prefixLen].toLowerCase();
        var allSame = true;
        for (var j = 1; j < pathsArr.length; j++) {
            var comp = pathsArr[j][prefixLen].toLowerCase();
            if (comp !== firstComp) {
                allSame = false;
                break;
            }
        }
        if (!allSame) {
            break;
        }
        prefixLen++;
    }
    return prefixLen;
}

//---------------------------------------------------------------------------------
function EscapeOpusArg(arg) {
    // Escape double-quotes for Opus commands
    return arg.replace(/"/g, '""');
}
