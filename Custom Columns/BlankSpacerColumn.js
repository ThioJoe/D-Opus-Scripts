function OnInit(initData) {
    initData.name = 'BlankSpacerScript';
    initData.version = '1.0.1';
    initData.copyright = '';
    initData.desc = 'Adds blank metadata coumn';
    initData.default_enable = true;
    initData.min_version = '12.0';
}

function OnAddColumns(addColData) {
    var col = addColData.AddColumn();
    col.method = 'OnColumn';
    col.name = 'BlankSpacerColumn';
    col.label = '[Blank Spacer]';
    col.header = ' ';
    col.justify = 'center';
    col.defwidth = 20;
    col.autorefresh = 0;
    col.autogroup = true;
    col.nosort=true;
    col.nogroup=true;
}
