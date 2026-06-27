local fake_engine = require("src.fake_engine")
local arg_parser = require("src.arg_parser")

local function with_slash(path)
	if path == nil or path == "" then return nil end
	local last = path:sub(-1)
	if last == "/" or last == "\\" then return path end
	return path .. "/"
end

local function split_mods(raw)
	local mods = {}
	if raw == nil or raw == "" then return mods end
	for mod in raw:gmatch("([^,]+)") do
		if mod ~= "" then table.insert(mods, mod) end
	end
	return mods
end

local options = arg_parser.parse({ "-sc", "26" })
options.data_path = with_slash(os.getenv("NOITA_DATA_PATH")) or with_slash(options.data_path)
options.noita_path = with_slash(os.getenv("NOITA_PATH")) or with_slash(options.noita_path) or options.data_path
if options.data_path == nil or options.data_path:match("^FILL_ME_IN") then
	error("Set NOITA_DATA_PATH to an extracted vanilla Noita data directory, or edit user_config.lua")
end
options.unlimited_spells = true
options.number_of_casts = tonumber(os.getenv("NOITA_CASTS") or "1")
options.mods = split_mods(os.getenv("NOITA_MODS"))

fake_engine.data_path = options.data_path
fake_engine.noita_path = options.noita_path
fake_engine.make_fake_api(options)

local text_formatter = require("src.text_formatter")
local mod_interface = require("src.mod_interface")

mod_interface.load_mods(options.mods)
fake_engine.initialise_engine(text_formatter, options)

local spell_by_code = {
	B = "BURST_8",
	["0"] = "DIVIDE_10",
	["3"] = "DIVIDE_3",
	["+"] = "ADD_TRIGGER",
	["4"] = "DIVIDE_4",
	["2"] = "DIVIDE_2",
	T = "TAU",
	F = "FLY_DOWNWARDS",
	E = "IF_ELSE",
	R = "RESET",
	H = "IF_HP",
	N = "IF_END",
	K = { name = "BLACK_HOLE", count = 0 },
}

local function decode(line)
	local spells = {}
	for i = 1, #line do
		local code = line:sub(i, i)
		local spell = spell_by_code[code]
		if spell == nil then error("unknown spell code: " .. code) end
		table.insert(spells, spell)
	end
	return spells
end

for line in io.lines() do
	if line and line ~= "" then
		local ok, result = pcall(function()
			options.spells = decode(line)
			fake_engine.evaluate(options, text_formatter)
			return fake_engine.counts["FLY_DOWNWARDS"] or 0
		end)

		if ok then
			print(result)
		else
			io.stderr:write(line .. ": " .. tostring(result) .. "\n")
			print("ERR")
		end
	end
end
