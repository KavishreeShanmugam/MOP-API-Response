var fs = require('fs'),
    activity_log_file = require('./log_file.js'),
    dirName = require('./config').morph_path;



//returnFileContent(req);
var returnFileContent = function(req) {
//function returnFileContent(req) {
    var playbook = req.Playbook;
    console.log("\n --> Playbook : " + playbook);

    var main_path = dirName + '/playbooks/draft/' + req.Playbook + '.json';
    var addGraph = addVerb(main_path, req);

    var doc = fs.readFileSync(main_path);
    doc = JSON.parse(doc);

    var playbook_tree_path = dirName + '/playbooks/draft/' + req.Playbook + '_tree.json'
    if (fs.existsSync(playbook_tree_path)) {
        var child_data = addChildTree(playbook_tree_path, doc, req);
    } else {
        var node_data = createNewTree(playbook_tree_path, req);
    }

    var doc1 = fs.readFileSync(playbook_tree_path, 'utf-8');
    var content = {
        "Playbook": req.Playbook,
        "tree": JSON.parse(doc1)
    };
    return content;
}

module.exports = returnFileContent;

function createNewTree(main_path, req) {
    var tree = {};
    tree["verb"] = req.verb;
    tree["id"] = 1;
    tree["cl"] = -1;
    tree["cr"] = -1;
    var fileContent = {};
    fileContent[req.phase] = tree;

    writeFileContent(main_path, fileContent);
}

function addChildTree(main_path, doc, req) {
    var tree = {};
    tree = readPlaybookTree(main_path);
    if (req.phase in tree) {
        tree[req.phase] = inorder(main_path, doc, tree[req.phase], req);
        writeFileContent(main_path, tree);
    } else {
        tree = addPhase(main_path, doc, tree, req);
        writeFileContent(main_path, tree);
    }
}

function inorder(main_path, doc, tree, req) {
    if (tree !== undefined) {
        if (tree["id"] == req.parentId) {
            if (req.side == "Left") {
                tree.cl = {
                    "verb": req.verb,
                    "id": findVerbId(doc) - 1,
                    "cl": -1,
                    "cr": -1
                };
            } else if (req.side == "Right") {
                tree.cr = {
                    "verb": req.verb,
                    "id": findVerbId(doc) - 1,
                    "cl": -1,
                    "cr": -1
                };
            }
        }
        inorder(main_path, doc, tree.cl, req);
        inorder(main_path, doc, tree.cr, req);
    }
    return tree;
}

function addPhase(main_path, doc, tree, req) {
    tree[req.phase] = {
        "verb": req.verb,
        "id": findVerbId(doc)-1,
        "cl": -1,
        "cr": -1
    };
return tree;
}

function readPlaybookTree(main_path) {
    if (fs.existsSync(main_path)) {
        var data = (fs.readFileSync(main_path, 'utf8'));
        data = JSON.parse(data);
        return data;
    }
}

function writeFileContent(main_path, datas) {
    fs.writeFileSync(main_path, JSON.stringify(datas, null, 2));
}


//Create a playbook without phase

function addVerb(main_path, req) {
    if (fs.existsSync(main_path)) {
        var child_data = addChildNode(main_path, req);
    } else {
        var node_data = createNewFile(main_path, req);
    }

}

function createNewFile(main_path, req) {
    var verb = {},
        verb_list = [],
        graph = {},
        graph_list = [],
        file_content = {};

    verb['VerbID'] = 1;
    verb['VerbName'] = req.verb;
    verb['VerbParameter'] = req.parameter;
    verb['Condition'] = req.condition;
    verb['phase'] = req.phase;

    graph['VerbID'] = 1;
    graph['Condition'] = req.condition;
    graph['predecessorVerb'] = req.parentId;
    graph['LeftVerb'] = -1;
    graph['RightVerb'] = -1;

    verb_list.push(verb);
    graph_list.push(graph);


    var graph_form = {};
    graph_form[req.phase] = graph_list

    file_content['Playbook'] = req.Playbook;
    file_content['Verb'] = verb_list;
    file_content['Graph'] = graph_form;
    writeFileContent(main_path, file_content);

    activity_log_file("Playbook", "Added", ">>>New Playbook-->'" + req.Playbook + "' has been created with a Parent Verb :'" + req.verb + "'");
}

function addChildNode(main_path, req) {
    var verb = {},
        verb_list = [],
        graph = {},
        graph_list = [];

    var doc = fs.readFileSync(main_path);
    doc = JSON.parse(doc);

    verb['VerbID'] = findVerbId(doc);
    verb['VerbName'] = req.verb;
    verb['VerbParameter'] = req.parameter;
    verb['Condition'] = req.condition;
    verb['phase'] = req.phase;

    graph['VerbID'] = findVerbId(doc);
    graph['Condition'] = req.condition;
    graph['predecessorVerb'] = req.parentId;

    doc.Verb.push(verb);

    if (req.parentId != 0 && req.succesorId == -1) {
        for (var i = 0; i < doc.Graph[req.phase].length; i++) {
            if (req.parentId == doc.Graph[req.phase][i]['VerbID']) {
                if (req.side == "Right") {
                    doc.Graph[req.phase][i].RightVerb = graph['VerbID'];
                } else {
                    doc.Graph[req.phase][i].LeftVerb = graph['VerbID'];
                }
            }
        }
        graph['LeftVerb'] = -1;
        graph['RightVerb'] = -1;
        doc.Graph[req.phase].push(graph);
    } else if (req.parentId == 0 && req.succesorId != -1) { //add at begin
        for (var i = 0; i < doc.Graph[req.phase].length; i++) {
            if (req.succesorId == doc.Graph[req.phase][i]['VerbID']) {
                doc.Graph[req.phase][i].predecessorVerb = graph['VerbID'];
                if (req.side == "Right") {
                    graph['LeftVerb'] = -1;
                    graph['RightVerb'] = doc.Graph[req.phase][i]['VerbID'];
                } else {
                    graph['RightVerb'] = -1
                    graph['LeftVerb'] = doc.Graph[req.phase][i]['VerbID'];
                }
            }
        }
        doc.Graph[req.phase].push(graph);
    } else if (req.parentId != 0 && req.succesorId != -1) { //add at begin
        for (var i = 0; i < doc.Graph[req.phase].length; i++) {
            if (req.parentId == doc.Graph[req.phase][i]['VerbID']) {
                if (req.side == "Right") {
                    graph['LeftVerb'] = -1;
                    graph['RightVerb'] = doc.Graph[req.phase][i].RightVerb;
                    doc.Graph[req.phase][i].RightVerb = graph['VerbID'];
                } else {
                    graph['RightVerb'] = -1
                    graph['LeftVerb'] = doc.Graph[req.phase][i].LeftVerb;
                    doc.Graph[req.phase][i].LeftVerb = graph['VerbID'];
                }
            }
            if (req.succesorId == doc.Graph[req.phase][i]['VerbID']) {
                doc.Graph[req.phase][i].predecessorVerb = graph['VerbID'];
            }
        }
        doc.Graph[req.phase].push(graph);
    } else if (req.parentId == 0 && req.succesorId == -1) {
        graph['LeftVerb'] = -1;
        graph['RightVerb'] = -1;
        var graph_list = [];
        graph_list.push(graph);

        doc.Graph[req.phase] = graph_list;
    }

    writeFileContent(main_path, doc);
    activity_log_file("Playbook", "Updated", ">>>Verb :'" + req.verb + "' is added to the Playbook-->'" + req.Playbook + "'");
}

function findVerbId(req) {
    var verb_id = "";
    for (var i = 0; i < req.Verb.length; i++) {
        verb_id = req.Verb[i].VerbID;
    }
    return verb_id + 1;
}
