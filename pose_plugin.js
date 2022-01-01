const HEAD = 0;
const HEAD_LAYER = 1;
const BODY = 2;
const BODY_LAYER = 3;
const R_LEG = 4;
const R_LEG_LAYER = 5;
const L_LEG = 6;
const L_LEG_LAYER = 7;
const R_ARM = 8;
const R_ARM_LAYER = 9;
const L_ARM = 10;
const L_ARM_LAYER = 11;

var parts = {
    [HEAD]: "head",
    // [HEAD_LAYER]: "Head Layer",
    [BODY]: "body",
    // [BODY_LAYER]: "Body Layer",
    [R_LEG]: "right_leg",
    // [R_LEG_LAYER]: "R Leg Layer",
    [L_LEG]: "left_leg",
    // [L_LEG_LAYER]: "L Leg Layer",
    [R_ARM]: "right_arm",
    // [R_ARM_LAYER]: "R Arm Layer",
    [L_ARM]: "left_arm",
    // [L_ARM_LAYER]: "L Arm Layer",
};

const THIRD_RIGHT = "thirdperson_righthand";
const THIRD_LEFT = "thirdperson_lefthand";

var active = false;

function createPoseData(pose_data) {
    pose_data["export"] = function () {
        return this;
    };

    return pose_data;
}

function createDefaultPoseData() {
    return createPoseData({
        "right": {
            [parts[HEAD]]: [0, 0, 0],
            [parts[BODY]]: [0, 0, 0],
            [parts[R_LEG]]: [0, 0, 0],
            [parts[L_LEG]]: [0, 0, 0],
            [parts[R_ARM]]: [22.5, 0, 0],
            [parts[L_ARM]]: [22.5, 0, 0]
        },
        "left": {
            [parts[HEAD]]: [0, 0, 0],
            [parts[BODY]]: [0, 0, 0],
            [parts[R_LEG]]: [0, 0, 0],
            [parts[L_LEG]]: [0, 0, 0],
            [parts[R_ARM]]: [22.5, 0, 0],
            [parts[L_ARM]]: [22.5, 0, 0]
        }
    });
}

// Model
var data = createDefaultPoseData();

function slotFromDisplaySlot(d_slot) {
    var slot;
    if (d_slot === THIRD_RIGHT) slot = "right";
    if (d_slot === THIRD_LEFT) slot = "left";
    return slot;
}

function updatePlayerModel() {
    var slot = slotFromDisplaySlot(display_slot);

    var model = window.displayReferenceObjects.refmodels.player.model;
    var entries = Object.entries(parts);

    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        var key = entry[0];
        var value = entry[1];

        var part = model.children[key];

        var part_data = data[slot][value];
        part.rotation.x = part_data[0] * Math.PI / 180;
        part.rotation.y = part_data[1] * Math.PI / 180;
        part.rotation.z = part_data[2] * Math.PI / 180;
    }

    Transformer.center();
}

function updatePose(identifier, axis, value) {
    var slot = slotFromDisplaySlot(display_slot);

    if (!slot) return;

    var rotation = data[slot][identifier];

    if (axis === "x") {
        rotation[0] = value;
    } else if (axis === "y") {
        rotation[1] = value;
    } else if (axis === "z") {
        rotation[2] = value;
    }

    data[slot][identifier] = rotation;
    updatePlayerModel();
}

function resetPlayerModel() {
    var model = window.displayReferenceObjects.refmodels.player.model;

    for (var i = 0; i < 12; i++) {
        model.children[i].rotation.x = 0;
        model.children[i].rotation.y = 0;
        model.children[i].rotation.z = 0;
    }

    model.children[R_ARM].rotation.x = 22.5 * Math.PI / 180;
    model.children[R_ARM_LAYER].rotation.x = 22.5 * Math.PI / 180;

    model.children[L_ARM].rotation.x = 22.5 * Math.PI / 180;
    model.children[L_ARM_LAYER].rotation.x = 22.5 * Math.PI / 180;
}

function resetDisplay() {
    display_scene.attach(display_area);
    if (display["thirdperson_righthand"]) DisplayMode.updateDisplayBase();
    resetPlayerModel();
}

function postInitDisplay(slot) {
    var model = window.displayReferenceObjects.refmodels.player.model;

    var hand;
    if (slot === THIRD_RIGHT) {
        hand = model.children[R_ARM];
    }

    if (slot === THIRD_LEFT) {
        hand = model.children[L_ARM];
    }

    hand.attach(display_area);
    updatePlayerModel();
}

function createLoadThirdWrapper(slot, fn) {
    return function () {
        resetDisplay();
        fn();
        postInitDisplay(slot);
        updateSliders();
        Transformer.center();
    }
}

function createUnloadThirdWrapper(fn) {
    return function () {
        resetDisplay();
        fn();
    }
}

function patchMethods() {
    DisplayMode.loadThirdRight = createLoadThirdWrapper(THIRD_RIGHT, DisplayMode.loadThirdRight);
    DisplayMode.loadThirdLeft = createLoadThirdWrapper(THIRD_LEFT, DisplayMode.loadThirdLeft);

    DisplayMode.loadFirstRight = createUnloadThirdWrapper(DisplayMode.loadFirstRight);
    DisplayMode.loadFirstLeft = createUnloadThirdWrapper(DisplayMode.loadFirstLeft);
    DisplayMode.loadHead = createUnloadThirdWrapper(DisplayMode.loadHead);
    DisplayMode.loadGUI = createUnloadThirdWrapper(DisplayMode.loadGUI);
    DisplayMode.loadGround = createUnloadThirdWrapper(DisplayMode.loadGround);
    DisplayMode.loadFixed = createUnloadThirdWrapper(DisplayMode.loadFixed);

    window.exitDisplaySettings = createUnloadThirdWrapper(window.exitDisplaySettings);
}

function patchJsonIO() {
    window.displayReferenceObjects.slots.push("pose");
    window.display["pose"] = data;

    var oldLoadJSON = DisplayMode.loadJSON;
    DisplayMode.loadJSON = function (json_data) {
        oldLoadJSON(json_data);
        if (json_data["pose"]) data = createPoseData(json_data["pose"]);
        else data = createDefaultPoseData();

        window.display["pose"] = data;
    }
}

function setUpInitHandlers() {
    var oldThirdRight = DisplayMode.loadThirdRight;
    var oldThirdLeft = DisplayMode.loadThirdLeft;

    DisplayMode.loadThirdRight = function () {
        oldThirdRight();
        DisplayMode.loadThirdRight = oldThirdRight;
        DisplayMode.loadThirdLeft = oldThirdLeft;
        setTimeout(function f() {
            init();
        }, 1000);
    };

    DisplayMode.loadThirdLeft = function () {
        oldThirdLeft();
        DisplayMode.loadThirdRight = oldThirdRight;
        DisplayMode.loadThirdLeft = oldThirdLeft;
        setTimeout(function f() {
            init();
        }, 1000);
    };
}

// Model
function fixHead(model) {
    model.geometry.computeBoundingBox();
    var boundingBox = model.geometry.boundingBox.clone();
    var box = boundingBox.max.sub(boundingBox.min);

    setRotationPoint(model, 0, 28 - (box.y / 2), 0);
}

function fixRightArm(model) {
    model.geometry.computeBoundingBox();
    var boundingBox = model.geometry.boundingBox.clone();

    var xLen = boundingBox.min.x - boundingBox.max.x;
    setRotationPoint(model, -xLen/4, 0, 0);

}

function fixLeftArm(model) {
    model.geometry.computeBoundingBox();
    var boundingBox = model.geometry.boundingBox.clone();

    var xLen = boundingBox.min.x - boundingBox.max.x;
    setRotationPoint(model, xLen/4, 0, 0);
}

function setRotationPoint(model, x, y, z) {
    model.geometry.translate(-x, -y, -z);
    model.position.x += x;
    model.position.y += y;
    model.position.z += z;
}

function patchModel(model) {
    var head = model.children[HEAD];
    fixHead(head);

    var rightArm = model.children[R_ARM];
    fixRightArm(rightArm);

    var leftArm = model.children[L_ARM];
    fixLeftArm(leftArm);

    var entries = Object.entries(parts);
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        var key = entry[0];
        model.children[key].rotation.order = "ZYX";
    }
}

// View
function updateSliders() {
    var slot = slotFromDisplaySlot(display_slot);

    var entries = Object.entries(parts);
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        var identifier = entry[1];

        $("#" + identifier + "_x input").val(data[slot][identifier][0]);
        $("#" + identifier + "_y input").val(data[slot][identifier][1]);
        $("#" + identifier + "_z input").val(data[slot][identifier][2]);
    }
}

function createEditPoseButton() {
    var editComponent = $("<div class=\"tool display_scale_invert\">" +
        "<div class=\"tooltip tl\">Change pose</div> " +
        "<i class=\"material-icons\">check_box_outline_blank</i>" +
        "</div>"
    );

    var icon = editComponent.find(".material-icons");

    editComponent.on("click", function (e) {
        active = !active;
        if (active) {
            $("#display_sliders").hide();
            $(".reference_model_bar").hide();
            $(".display_ref_bar").hide();
            $("#pose_sliders").show();

            icon.text("check_box")
        } else {
            $("#display_sliders").show();
            $(".reference_model_bar").show();
            $(".display_ref_bar").show();
            $("#pose_sliders").hide();
            icon.text("check_box_outline_blank")
        }
    });

    return editComponent;
}

function createRotationComponent(identifier, toRotate, axis) {
    // id="' + identifier + "_" + axis + '"
    var component = $('<div id="' + identifier + "_" + axis + '" class="bar slider_input_combo">' +
        '<input type="range" min="-180" max="180" step="1" value="0" class="tool disp_range">' +
        '<input type="number" min="-180" max="180" step="0.5" value="0" class="tool disp_text">' +
        '</div>');

    var tools = component.find(".tool");
    tools.on("input change", function (event) {
        tools.val(event.target.value);
        updatePose(identifier, axis, parseInt($(event.target).val()))
    });

    return component;
}

function initGUI() {
    var model = window.displayReferenceObjects.refmodels.player.model;

    $("#display .toolbar").first().append(createEditPoseButton());

    var poseSlider = $("<div id='pose_sliders'></div>").hide();
    $.each(model.children, function (index) {
        if (parts[index]) {
            var identifier = parts[index];
            poseSlider.append("<p class=\"tl\">" + identifier + "</p>");
            poseSlider.append(createRotationComponent(identifier, model.children[index], "x"));
            poseSlider.append(createRotationComponent(identifier, model.children[index], "y"));
            poseSlider.append(createRotationComponent(identifier, model.children[index], "z"));
        }
    });

    var container = $("#left_bar").first();
    container.append(poseSlider);
}

// Global
function init() {
    initGUI();

    var model = window.displayReferenceObjects.refmodels.player.model;
    patchModel(model);
    patchMethods();

    postInitDisplay(display_slot);
    updateSliders();
    Transformer.center();
}

Plugin.register("pose_plugin", {
    name: 'pose_plugin',
    author: "xunto",
    icon: "accessibility",
    version: "1.0.0",
    description: 'Change player preview pose!',
    variant: "both",
    onload() {
        patchJsonIO();
        if (display_mode) init();
        else setUpInitHandlers();
    }
});

window.pose_data = data;
