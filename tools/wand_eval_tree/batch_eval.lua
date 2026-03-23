local fake_engine = require("src.fake_engine")
local arg_parser = require("src.arg_parser")
-- Pass minimal args to satisfy parser requirement
local options = arg_parser.parse({"-sc", "26"}) 

-- Override with user's specific paths from previous terminal logs
options.data_path = "E:/download/gggit/noitadata/"
options.noita_path = "E:/software/steam/steamapps/common/Noita/"
options.unlimited_spells = true
options.number_of_casts = 1

fake_engine.data_path = options.data_path
fake_engine.noita_path = options.noita_path
fake_engine.make_fake_api(options)

local text_formatter = require("src.text_formatter")
local mod_interface = require("src.mod_interface")

-- Minimal mod list to ensure vanilla behaviors are correct as per user environment
options.mods = { "twwe_mock" } 

mod_interface.load_mods(options.mods)
fake_engine.initialise_engine(text_formatter, options)

-- Read combinations from stdin
-- Format: SPELL1,SPELL2...
for line in io.lines() do
    if line and line ~= "" then
        local spells = {}
        for s in line:gmatch("([^,]+)") do
            table.insert(spells, s)
        end
        
        -- Reset and Evaluate using the public API
        options.spells = spells
        fake_engine.evaluate(options, text_formatter)
        
        local count = fake_engine.counts["FLY_DOWNWARDS"] or 0
        -- Output format: combination:count
        print(line .. ":" .. count)
    end
end
