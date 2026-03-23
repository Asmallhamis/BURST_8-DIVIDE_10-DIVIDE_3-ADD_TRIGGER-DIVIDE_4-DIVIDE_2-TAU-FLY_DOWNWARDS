local function table_insert_all (new_actions)
	for i,v in ipairs(new_actions) do
		table.insert (actions, v)
	end
end

local new_actions = {
	
	--* MODIFIERS 
	
	{
		id          = "FOLLOW_CURSOR",
		name 		= "Cursor following",
		description = "Makes a projectile follow your crosshair",
		sprite 		= "mods/nobys_things/mod_data/images/ui_gfx/cursor_follow.png",
		sprite_unidentified = "data/ui_gfx/gun_actions/sinewave_unidentified.png",
		related_extra_entities = "mods/nobys_things/mod_data/entities/misc/cursor_follow.xml",
		type 		= ACTION_TYPE_MODIFIER,
		spawn_level                       = "1,2,3,4,5,6", -- HOMING
		spawn_probability                 = "0.1,0.4,0.4,0.4,0.4,0.4", -- HOMING
		price = 220,
		mana = 40,
		action 		= function()
			c.extra_entities = c.extra_entities .. "mods/nobys_things/mod_data/entities/misc/cursor_follow.xml,"
			draw_actions( 1, true )
		end,
	},
	{
		id          = "HOMING_CURSOR_REAL",
		name 		= "Cursor homing",
		description = "Makes a projectile accelerate towards your crosshair",
		sprite 		= "mods/nobys_things/mod_data/images/ui_gfx/cursor_homing.png",
		sprite_unidentified = "data/ui_gfx/gun_actions/sinewave_unidentified.png",
		related_extra_entities = "mods/nobys_things/mod_data/entities/misc/cursor_homing.xml",
		type 		= ACTION_TYPE_MODIFIER,
		spawn_level                       = "1,2,3,4,5,6", -- HOMING
		spawn_probability                 = "0.1,0.4,0.4,0.4,0.4,0.4", -- HOMING
		price = 220,
		mana = 60,
		action 		= function()
			c.extra_entities = c.extra_entities .. "mods/nobys_things/mod_data/entities/misc/cursor_homing.xml,"
			draw_actions( 1, true )
		end,
	},
	{
		id          = "GRAVITY_DISABLE",
		name 		= "Disable gravity",
		description = "Makes projectile unaffected by gravity",
		sprite 		= "mods/nobys_things/mod_data/images/ui_gfx/gravity_disable.png",
		sprite_unidentified = "data/ui_gfx/gun_actions/i_shape_unidentified.png",
		type 		= ACTION_TYPE_MODIFIER,
		spawn_level                       = "2,3,4,5,6,10", -- GRAVITY_ANTI
		spawn_probability                 = "0.5,0.4,0.4,0.3,0.3,0.3", -- GRAVITY_ANTI
		price = 30,
		mana = 10,
		--max_uses = 100,
		action = function()
			c.gravity = 0
			c.extra_entities = c.extra_entities .. "mods/nobys_things/mod_data/entities/misc/gravity_disable.xml,"
			draw_actions( 1, true )
		end,
	},
	{
		id          = "PENETRATING_SHOT",
		name 		= "Penetrating shot",
		description = "Makes the projectile not die when colliding with enemies, but it can only hit each enemy once",
		sprite 		= "mods/nobys_things/mod_data/images/ui_gfx/penetrating_shot.png",
		sprite_unidentified = "data/ui_gfx/gun_actions/homing_unidentified.png",
		type 		= ACTION_TYPE_MODIFIER,
		spawn_level                       = "2,3,4,5,6", -- PIERCING_SHOT
		spawn_probability                 = "0.4,0.5,0.6,0.6,0.4", -- PIERCING_SHOT
		price = 190,
		mana = 80,
		--max_uses = 100,
		action 		= function()
			c.extra_entities = c.extra_entities .. "mods/nobys_things/mod_data/entities/misc/penetrating_shot.xml,"
			draw_actions( 1, true )
		end,
	},
	{
		id          = "INFINITE_LIFETIME",
		name 		= "Infinite lifetime",
		description = "Makes projectile last forever",
		sprite 		= "mods/nobys_things/mod_data/images/ui_gfx/infinite_lifetime.png",
		sprite_unidentified = "data/ui_gfx/gun_actions/spread_reduce_unidentified.png",
		type 		= ACTION_TYPE_MODIFIER,
		spawn_level                       = "6,10", -- LIFETIME
		spawn_probability                 = "0.1,0.1", -- LIFETIME
		price = 350,
		mana = 120,
		max_uses = 3,
		custom_xml_file = "data/entities/misc/custom_cards/lifetime_infinite.xml",
		action 		= function()
			c.extra_entities = c.extra_entities .. "mods/nobys_things/mod_data/entities/misc/infinite_lifetime.xml,data/entities/particles/tinyspark_yellow.xml,"
			c.fire_rate_wait = c.fire_rate_wait + 13
			draw_actions( 1, true )
		end,
	},
	
	--* LOGIC SPELLS 

	{
		id          = "DRAW_EAT",
		name 		= "Eat 1 draw",
		description = "Takes 1 place in a multicast but self-discards",
		sprite 		= "mods/nobys_things/mod_data/images/ui_gfx/eat_draw.png",
		sprite_unidentified = "data/ui_gfx/gun_actions/i_shape_unidentified.png",
		type 		= ACTION_TYPE_OTHER,
		spawn_level                       = "10",
		spawn_probability                 = "0.3",
		price = 30,
		mana = 0,
		--max_uses = 100,
		action = function()
			local data = hand[#hand]
			if ( #hand > 0 ) and ( data ~= nil ) and ( data.id == "DRAW_EAT" ) then
				table.insert( discarded, data )
				table.remove( hand, #hand )
			end
		end,
	},

	{
		id          = "STOP_PROJECTILES",
		name 		= "Stop projectiles",
		description = "Prevents any projectiles after it from spawning",
		sprite 		= "mods/nobys_things/mod_data/images/ui_gfx/stop_projectiles.png",
		sprite_unidentified = "data/ui_gfx/gun_actions/i_shape_unidentified.png",
		type 		= ACTION_TYPE_OTHER,
		spawn_level                       = "10",
		spawn_probability                 = "0.3",
		price = 0,
		mana = 0,
		--max_uses = 100,
		action = function()
			add_projectile("")
		end,
	},
}

table_insert_all(new_actions)