// Proposed isolated staging process. Confirm that port 8094 is free before use.
module.exports={apps:[{name:'gesplaft-test',cwd:'/var/www/gesplaft-test',script:'dist-vps/server/server.mjs',interpreter:'node',node_args:'--env-file=/etc/gesplaft/test.env',instances:1,exec_mode:'fork',autorestart:true,max_memory_restart:'400M'}]};
