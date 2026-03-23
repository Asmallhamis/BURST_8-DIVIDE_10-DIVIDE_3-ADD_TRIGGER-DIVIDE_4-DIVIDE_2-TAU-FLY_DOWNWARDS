-- 精确调试: 完全模拟 main.lua 的流程并加入抓取点
local arg_parser = require("src.arg_parser")

local sim_args = {
    "-dp", "E:/download/wand2h/noitadata/",
    "-mp", "E:/software/steam/steamapps/common/Noita/",
    "-j",
    "-sc", "1",
    "-ma", "100000", "-mx", "100000", "-mc", "100000",
    "-rt", "20", "-cd", "10",
    "-sm", "1", "-sd", "0",
    "-nc", "1",
    "-u", "true", "-e", "true",
    "-sr", "true",
    "-md", "twwe_mock", "The-Focus",
    "-sp", "11:LIGHT_BULLET",
}

local options = arg_parser.parse(sim_args)

local fake_engine = require("src.fake_engine")
fake_engine.data_path = options.data_path
fake_engine.noita_path = options.noita_path
fake_engine.make_fake_api(options)

local text_formatter = require("src.text_formatter")
print_table = require("src.print")
local mod_interface = require("src.mod_interface")

print("=== Loading mods ===")
mod_interface.load_mods(options.mods)
print("Mods loaded OK")

-- 清空 dofile log
local dofile_call_log = {}
local _current_dofile = dofile

-- Hook dofile to log
local function hooked_dofile(file)
    table.insert(dofile_call_log, file)
    return _current_dofile(file)
end
dofile = hooked_dofile
dofile_once = hooked_dofile

print("\n=== Initializing engine ===")
text_formatter.init_cols(options.colour_scheme, options.ansi)
fake_engine.initialise_engine(text_formatter, options)
print("Engine init OK")

-- 检查 dofile 调用
print("\n=== dofile calls during engine init containing 'Focus' or 'gen': ===")
for _, f in ipairs(dofile_call_log) do
    if f:lower():find("focus") or f:find("gen_") or f:find("action_folder") or f:find("action%.lua") then
        print("  " .. f)
    end
end

-- 检查 THE-FOCUS 法术
print("\n=== THE-FOCUS related spells: ===")
local count = 0
if actions then
    for _, a in ipairs(actions) do
        if a.id and (a.id:find("FOCUS") or a.id:find("THE%-") or a.id:find("___")) then
            print("  " .. a.id)
            count = count + 1
        end
    end
end
print("Found: " .. count)
print("Total actions: " .. (actions and #actions or 0))
