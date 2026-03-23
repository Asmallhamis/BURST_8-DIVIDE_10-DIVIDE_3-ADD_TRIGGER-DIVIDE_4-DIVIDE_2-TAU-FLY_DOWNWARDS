---@diagnostic disable: missing-fields
-- this file will override the defaults the arg parser uses, so you can specify data path easily / other common settings easily.

---@type options
local user_config = {
	-- 修改为你的 Noita data 路径 (例如 C:/Steam/steamapps/common/Noita/data/)
	-- Set this to your extracted Noita data path (e.g., C:/Steam/steamapps/common/Noita/data/)
	noita_path = "FILL_ME_IN/noitadata/",
	data_path = "FILL_ME_IN/noitadata/",
}

return user_config
