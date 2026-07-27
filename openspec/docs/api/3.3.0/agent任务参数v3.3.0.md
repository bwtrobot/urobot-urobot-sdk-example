# agent任务参数 v3.3.0

> 本文档由 `agent任务参数 v3.3.0.docx` 转换而来，供版本管理与检索使用。
> 「快速任务」列中 ✅ 表示支持快速执行（fast_execute），❌ 表示不支持。

全部任务指令 command_code 一览（fast_execute ✅ 表示快速执行任务）。

| command_code | 说明 | 快速任务 |
| --- | --- | --- |
| robot_info_upload_req | 机器人基础信息上报指令 | ✅ |
| subscribe_manage | 订阅管理指令 | ✅ |
| task_status_query | 任务状态查询 | ✅ |
| emergency_stop | 紧急停止 | ❌ |
| robot_pause | 任务暂停继续 | ✅ |
| robot_config | 设备配置指令， v2.9.0以下版本 | ❌ |
| agent_config | agent配置指令 | ✅ |
| robot_config_v2 | 设备配置指令 | ✅ |
| navigation | 导航指令 | ❌ |
| mark_navigation_point | 自定义导航点指令 | ✅ |
| topology_navigation | 拓扑路径导航指令 | ❌ |
| pose_init | 位姿初始化 | ❌ |
| base_move | 前后左右基础运动、横移、蹲下、站立、匍匐 | ✅ |
| cmd_vel | 手柄运动 | ✅ |
| take_photo_upload | 机器人拍照上传图片 | ✅ |
| point_cloud_map_build | 点云地图构建开关指令 | ❌ |
| point_cloud_refresh | 点云刷新指令 | ✅ |
| point_cloud_map_delete | 点云地图删除指令 | ❌ |
| point_cloud_map_update | 点云地图补充建图指令 | ❌ |
| point_cloud_map_query | 点云地图查询指令 | ❌ |
| point_cloud_map_notice | 接收点云地图下发指令 | ❌ |
| point_cloud_map_active | 点云地图激活指令 | ❌ |
| point_cloud_map_upload | 点云地图上传指令 | ❌ |
| point_cloud_map_concat | 点云地图组合指令 | ❌ |
| action_recording | 动作录制指令 | ❌ |
| action_play | 动作执行指令 | ❌ |
| exhibition_guide | 展厅讲解 | ❌ |
| tts_play | 语音播放 | ❌ |
| robot_tts | 机器人语音播报 | ✅ |
| charge_manager | 机器人充电指令 | ❌ |
| robot_operate | 机器人操作 | ✅ |
| face_body_add_entity | 机器人人脸识别添加实体 | ❌ |
| robot_dance | 机器人跳舞指令 | ✅ |
| motion_lock | 运动锁定指令 | ✅ |
| real_time_conversation | 机器人实时对话 | ✅ |
| obstacle_avoidance_broadcast | 避障播报开关 | ✅ |
| ai_generate | AI生成任务 | ✅ |
| play_music | 音乐播放控制指令 | ❌ |
| knowledge_embed | 知识库嵌入指令 | ✅ |
| knowledge_sync | 知识库同步指令 | ✅ |

## 任务参数

### 任务数据

```jsonc
{
"task_id": "123",
"task_command_info": [
{
"command_id": "456",
"command_code": "emergency_stop",
"command_param": {}
}
]
}
```

### 指令参数 command_param

### 机器人锁定解锁 motion_lock

### 暂停继续 robot_pause

### 机器人配置 robot_config

```jsonc
{
"wake_word": ["小通","小同"],
"tts_channel": "bailian", # tts通道  bailian、kokoro、xunfei
"voice": "Cherry", # tts合成音色  cherry （百炼通道）、zm_yunjian+zm_yunxi （kokoro通道）、
xiaoyuan （讯飞通道）
"voice_print": true, # 声纹开关  true false "chat_wake_interval": 10, # 聊天模式唤醒间隔
"task_wake_interval": 10, # 任务模式唤醒间隔
"target_velocity": "0.45",
"global_influence_radius": "0.31", #膨胀系数
"nav_sense": "OFFICE", #导航场景OFFICE、STREET
"ai_config": {
"base_url": "",
"api_key": "sk-123",
"model": "qwen3-max",
"prompt": "你是机器人。。。  " #角色设定 },
"run_model": "chat-task" #模式  chat-only 对话模式， chat-task 任务模式 }
```

### agent配置 agent_config
```
{

"common": {

"agent_name": "",

"desc": ""

},

"tts_config": {

"wake_word": [

"小通",

"小同 "

],

"tts_channel": "volcengine", # TTS 通道  kokoro、xunfei、bailian、volcengine "voice": "zh_female_cancan_uranus_bigtts",

"tts_url": "",

"tts_config_ext": "{\"resource_id\":\"seed-tts-2.0\",\"api_key\":\"xxx\"}", # json对象或字符串均可；其中  api_key 解析后作为  TTS 服务密钥透传下游

"emotion_enabled": false,

"response_word": ["在", "我在"], # 回应词

"buff_word": ["我思考一下", "好的"] # 缓冲词，透传下游 },

"agent_build_params": {

"agent_id": "robot-assistant-001",

"sys_prompt": "你是一个机器人助手，回复不要出现表情符号，只回复纯文本",

"model_api_type": "openai", # openai：百炼平台模型； ark：方舟平台模型；

"base_url": "",

"api_key": "sk-your-api-key-here",

"model_name": "qwen3-max",

"enable_knowledge": true,

"knowledge_channel": "bailian", # bailian：百炼知识库通道     local：本地知识库通道

"bailian_knowledge_config": [

{

"access_key_id": "LTAI5t...",

"access_key_secret": "your-access-key-secret",

"workspace_id": "workspace-123456",

"index id": "index-789012"

}

],

"local_knowledge_config": [

{

"knowledge_id": "agent_kb"

}

],

"enable_robot_tools": true,

"selected_robot_tools": {

"faceBody": {

"face_match_interval": 5,

"db_name": "robot_face_db",

"entity_list": [

{

"entity_id": "user_001",

"custom_prompt": "欢迎张三回来，今天天气不错",

"face_match_info": {

"Confidence": 95.5,

"DbName": "robot_face_db", "EntityId": "user_001",

"ExtraData": "VIP用户",

"FaceId": "face_12345",

"Score": 98.2

}

},

{

"entity_id": "user_002",

"custom_prompt": "欢迎李四， 需要带您去会议室吗",

"face match info": null }

]

},

### 机器人配置 robot_config_v2

{

"asr_config": {

"asr_channel": "funasr",

"voice_print": true,

"wake_interval": 5,

"asr_url": "ws://127.0.0.1:10095",

"asr_config_ext": "{\"api_key\":\"xxx\"}", # json对象或字符串均可；其中  api_key 解析后作为  ASR 服务密钥透传下游

"emotion enabled": false

},

"nav_config": {

"target_velocity": "0.45",

"global_influence_radius": "0.31",

"nav  sense": "OFFICE"

},

"uwb_track_config": {

"track_flag": true,        # 跟随开关

"track_distance": 1.5      # 伴行距离  double单位m

},

"agent_config": {

"common": {

"agent_name": "",

"desc": ""

},

"tts_config": {

"wake_word": [

"小通",

"小同 "

],

"tts_channel": "volcengine",

"voice": "zh_female_cancan_uranus_bigtts",

"tts_url": "",

"tts_config_ext": "{\"resource_id\":\"seed-tts-2.0\",\"api_key\":\"xxx\"}", #

json对象或字符串均可；其中  api_key 作为  TTS 服务密钥透传下游

"emotion_enabled": false,

"response_word": ["在", "我在"], # 回应词

"buff_word": ["我思考一下", "好的"] # 缓冲词，透传下游

},

"agent_build_params": {

"agent_id": "robot-assistant-001",

"sys_prompt": "你是一个机器人助手，回复不要出现表情符号，只回复纯文本", "model_api_type": "openai",

"base_url": "",

"api_key": "sk-your-api-key-here",

"model_name": "qwen3-max",

"enable_knowledge": true,

"knowledge_channel": "bailian",

"bailian_knowledge_config": {

"access_key_id": "LTAI5t...",

"access_key_secret": "your-access-key-secret",

"workspace_id": "workspace-123456",

"index id": "index-789012"

},

"enable_robot_tools": true,

"selected_robot_tools": {

"faceBody": {

"face_match_interval": 5,

"db_name": "robot_face_db",

"entity_list": [

{

"entity_id": "user_001",

"custom_prompt": "欢迎张三回来，今天天气不错",

"face_match_info": {

"Confidence": 95.5,

"DbName": "robot_face_db", "EntityId": "user_001",

"ExtraData": "VIP用户",

"FaceId": "face_12345",

"Score": 98.2

}

},

{

"entity_id": "user_002",

"custom_prompt": "欢迎李四， 需要带您去会议室吗", "face match info": null

}

]

},

"takePic": null,

"navigateToPoint ": null

}

},

"auth_config": {

"access_key": "your-access-key",

"secret_key": "your-secret-key"

}

}
```

### 机器人基础信息上报开关 robot_info_upload_req

| "command_param": true   # true:开启上报（立即上报一次并持续上报）； false:关闭上报 | "command_param": true   # true:开启上报（立即上报一次并持续上报）； false:关闭上报 | "command_param": true   # true:开启上报（立即上报一次并持续上报）； false:关闭上报 | "command_param": true   # true:开启上报（立即上报一次并持续上报）； false:关闭上报 |
| --- | --- | --- | --- |
| 开启后，机器人基础信息通过 socket 消息（messageType=robot_info_upload） 持续上报，上报对象字段如下（object 类型字段的子字段在 「子字段」列展开）： | 开启后，机器人基础信息通过 socket 消息（messageType=robot_info_upload） 持续上报，上报对象字段如下（object 类型字段的子字段在 「子字段」列展开）： | 开启后，机器人基础信息通过 socket 消息（messageType=robot_info_upload） 持续上报，上报对象字段如下（object 类型字段的子字段在 「子字段」列展开）： | 开启后，机器人基础信息通过 socket 消息（messageType=robot_info_upload） 持续上报，上报对象字段如下（object 类型字段的子字段在 「子字段」列展开）： |
| 字段 | 类型 | 子字段 | 说明 |
| morphology | string | - | 机器人空间场景形态：<br>physical 物理 / simulation 仿真 |
| sim_stream | string | - | 仿真视频流地址 |
| version | string | - | 系统版本 |
| serial_number | string | - | 机器 SN 码 |
| cpu_temperature | int | - | CPU 温度 |
| cpu_load | double | - | CPU 负载 |
| used_memory | double | - | 内存占用率 |
| net_name | string | - | 网卡名 |
| net_mac_address | string | - | 网卡 MAC 地址 |
| net_ip_address | string | - | 网卡 IPv4 地址 |
| up_bw | double | - | 上行带宽 |
| down_bw | double | - | 下行带宽 |
| level_dbm | double | - | 网络信号强度 |
| disk_usage | int | - | 磁盘用量比例 |
| soc | int | - | 电池电量 |
| current | int | - | 电流 |
| voltage | int | - | 电压 |
| motion_control | string | - | 运控模式 |
| charge | object | - | 充电信息 |
|  |  | status(int) | 充电状态： 0 空闲 / 1 充电中 /<br>2 异常 |
|  |  | org_value(int) | 原始值 |
| motion_lock | bool | - | 运动锁定： true 锁定 / false未锁定 |
| robot_state | object | - | 机器人运控状态 |
|  |  | status(int) | 0 未知 / 1 可行走站立 / 2 不可行走站立 / 3 正常趴下 / 4 异<br>常趴下 |
|  |  | status_desc(string) | 状态描述 |
|  |  | org_value(object) | 原始值：<br>x30_basic_value(int)、 x30_gait_value(int) 、 value_desc(string) |
| run_model | string | - | 当前模式： chat-only 对话模式 / chat-task 任务模式 |
| control_status | string | - | 导航-控制状态 |
| damp | int | - | 阻尼： 0 零力矩 / 1 阻尼 / 2 位控下蹲 |
| map_name | string | - | 当前激活地图名称 |
| package_path | string | - | 激活地图包路径/ID |
| version_path | string | - | 激活地图版本路径/ID |
| state | string | - | 导航-主状态（/<br>x_nav/master/state） |
| nav_state | string | - | 导航-nav 状态（/nav/state） |
| base_link_height | string | - | base_link 高度 |
| slam_state_error | bool | - | slam 状态异常， 连续 -1 为异常 |
| ros_odom | object | - | 实时位姿 |
|  |  | pose(object) | 位姿数据 |
| vel | object | - | 速度 |
|  |  | linear_combined(double) | 合成线速度， 单位 m/s |
|  |  | angular_z(double) | 旋转速度， 单位 度/s |
| obstacle_avoidance_broadcast | bool | - | 避障播报开关 |
| ground_map_area | string | - | 当前激活地图区域面积（平方⽶） |
| nav_remaining_distance | string | - | 导航剩余距离（米）， 距当前规划路径终点的曲线距离，<br>1Hz 更新 |
| uwb_track_config | object | - | UWB 跟随配置 |
|  |  | track_flag(bool) | 跟随开关 |
|  |  | track_distance(double) | 伴行距离，单位 m |
| uwb_state | bool | - | UWB 状态 |

### 机器人操作 robot_operate

```jsonc
{
"operate_type": 1, # 1:清空聊天记忆  ;2:切换机器人模式； 3:机器人系统升级； 4：仿真机器人重启； 5：
B2软急停（趴下， 需重启机器狗才能恢复站立）； 6：移动速度控制（修改导航跟踪速度，单位m/s）； 7：G1运控模式切换； 8：终止agent推理； 9：清空agent对话记录（agentscope会话记忆）； 10：跟随控制/UWB跟随开关
"operate_param": {
"conversation_id": "123", # operate_type=1 清空的聊天记忆ID必填；operate_type=8 终止
推理的会话ID；operate_type=9 清空对话记录的会话ID必填
"run_model": "chat-task", # 任务chat-task、聊天chat-only operate_type=2必填"version": "v2.6.0" # 升级版本号  operate_type=3必填
"restart_simulation": true # 仿真机器人重启  operate_type=4必填
# operate_type=5 无需额外参数，传空对象  {} 即可
"target_velocity": 0.8 # 导航跟踪速度  单位m/s operate_type=6必填
"motion_mode": "lock_stand" # G1运控模式  operate_type=7必填，可选值 ：zero_torque(零力矩)/damp(阻尼)/squat(位控下蹲)/sit(位控落座)/lock_stand(锁定站立)/balance_squat(平衡下蹲/蹲
起)/lie_stand(躺起)/normal_ctrl(常规运控)/normal_ctrl_waist(常规运控含腰部)/walk_run_ctrl(走跑运控)
"agent_id": "robot-assistant-001" # 终止推理目标agentId operate_type=8必填； operate_type=9 清空对话记录目标agentId必填
"track_flag": true, # 跟随开关  true/false operate_type=10必填
"track_distance": 1.5 # 伴行距离  double单位m }
}
```

### 建图 point_cloud_map_build

```jsonc
{
"build_flag": "start" # start开始建图 , cancel取消建图， end完成建图"map_id": "123",
"file_key": "123"
}
```

### 基础运动 base_move

```jsonc
{
"key": "ArrowUp" # "ArrowUp","ArrowDown","ArrowLeft","ArrowRight","s" 开启关闭横移模
式， "crawl" 匍匐 }
```

### 点云刷新 point_cloud_refresh

```jsonc
{
}
```

### 删除地图 point_cloud_map_delete

```jsonc
{
"map_id": "123", # 地图id
"package_id": "456" # 地图包id
}
```

### 更新地图 point_cloud_map_update

### 查询激活的地图信息 point_cloud_map_query

```jsonc
{}
查询结果
{
"map_name": "123", # 地图id
"package_path": "123/navmap/456", # 激活的地图包
"version_path": "123/maincenter/789" # 激活的地图版本 }
```

### 激活 point_cloud_map_active

### 下发地图 point_cloud_map_notice

```jsonc
{
"map_id": "123",
"package_id": "123",
"download url": "123"
}
```

本地中枢模式（env CENTER_RUNNING_MODEL=STANDALONE）：不走网络下载， 从 download_url 截取 /api/smc/v1/file/{操作}/ 之后的相对路径（如 /）， 拼接中枢地图根目录（env CENTER_FILE_ROOT_PATH）定位地图文件， cp 到临时目录后解压。入参/出参不变。

### 上传地图包 point_cloud_map_upload

```jsonc
{
"map_id": "123",
"package_id": "123"
}
{
"path": "abc",
"map_id": "123",
"package_id": "456"
}
```

本地中枢模式（env CENTER_RUNNING_MODEL=STANDALONE）：不走网络上传，地图压缩为

{ 后 cp 到中枢地图根目录（env CENTER_FILE_ROOT_PATH）， path 返回该文件名。入参/出参不变。

### 合成地图包 point_cloud_map_concat

```jsonc
{
"map_id": "123",
"package_id": "123",
resources":[""]
}
{
}
```

### 上传日志 log_upload

```jsonc
{
"date": "2025-09-02" # 日志yyyy-MM-dd,历史30天以内
}
{
"path": "" }
L── robot-2025-09-02/
ŀ── agent.log
L── robot_control.log
```

### 语音播报 robot_tts

```jsonc
{
"text": "你好",          # 必填，播报文本
"wait_result": true      # 可选， 默认   false。为   true 时通过   /tts_text 下发结构化指令并等待
/tts_text_result 回执后回调；为   false （或不传）时直接走普通  TTS，立即返回完成 }
```

### 动作录制指令 action_recording

prepare 、start 、recover 、stop

### 音乐播放控制指令 play_music

异步任务，机器人执行后通过 /agent_command_reply 回执闭环。

action=play 且 song 为 URL 链接：播放该链接音乐

action=play 且 song 为歌曲名：播放本地对应音乐

action=stop：停止播放

### 机器人充电指令 charge_manager

### task状态查询指令 task_status_query

```jsonc
{
"task_id": "123" # 需要查询状态的任务id
}
{
"task_id": "123",
"status": "executing" # executing、unprocess、finished、error、terminated }
```

查询知识库嵌入任务（knowledge_embed 的 task_id）时， 额外返回实时嵌入进度：

```jsonc
{

"task": null,

"knowledge_id": "agent",

"embedding_progress": {

"status"  "RUNNING"

"error": null,

"files": [

{"fileName": "agent任务参数.pdf", "totalChunks": 116, "doneChunks": 60,

"percent": 52},

{"fileName": "bwt.docx", "totalChunks": 0, "doneChunks": 0, "percent": 0}

]

}

}
```

### 展厅讲解指令 exhibition_guide

```jsonc
{
"text": "123", # 讲解的文本内容
"estimated_time": 2, # 预估的讲解时长， 单位为秒
"url": "123", # 讲解时的动作/姿势
"action_delay": "123", # 讲解开始多长时间后开始动作，  单位为秒"home_manage": "123", # 智能家居管理， 例如开启、关闭温馨模式 "manage_delay": 3, # 智能家居管理， 延期处理时间单位为秒
"delay": 1 # 讲解之间的时间间隔， 单位为秒
}
```

### 单点导航指令 navigation

```jsonc
{
"point_name": "F1", # 导航点名称优先处理
"position": {
"x": 2.2522,
"y": -0.881949538099388,
"z": -1.3875
},
"orientation": {
"x": -0.014707664919881869,
"y": 0.7203878073631774,
"z": 0.6934150971808892,
"w": -0.0007711009636985258
},
"nav_voice_control": false,
"look at": true
}
```

### 拓扑路径导航指令 topology_navigation

```jsonc
{

"point": [

{

"position": {

"x": 2.2522,

"y": -0.881949538099388,

"z": -1.3875

},

"orientation": {

"x": -0.014707664919881869,

"y": 0.7203878073631774,

"z": 0.6934150971808892,

"w": -0.0007711009636985258

},

"nav_voice_control": false,

"look at": true

}

]
```

### 拨杆运动 command_code = cmd_vel

```jsonc
"command_param":{
"linear": {
"x": 2.2522,
"y": -0.881949538099388,
"z": -1.3875
},
"angular": {
"x": -0.014707664919881869,
"y": 0.7203878073631774,
"z": 0.6934150971808892,
}
}
```

### 迎宾模式配置指令 robot_guide_config

### 拍照上传 take_photo_upload

```jsonc
{
"camera_type": "front" }
```

```jsonc
{
"path": "-
xxx.jpg",
"url": "-
xxx.jpg",
"fileKey": "bwton/tmp/robot-photo-xxx.jpg",
"fileName": "robot-photo-1747795200000-1a2b3c4d.jpg",
"imageType"  "url"
"format"  "jpg"
"captureTime": "2026-05-21T10:00:00+08:00",
"source": "camera_cache",
"cameraType": "front" }
```

### AI生成任务 指令 ai_generate

统一入口， 按顶层 type 字段分流：

t2i：文生图， 沿用百炼/方舟双渠道。百炼默认模型  z-image-turbo （轻量小模型，成本更低； 单次仅出 1 张图， 故按  image_count 并发多次调用凑齐张数，对外仍返回多张），方舟默认模型doubao-

t2t ：生成/优化系统 prompt 。 prompt 字段传"角色设定 " ；模型参数

model_api_type / api_key / model_name / base_url 必填， 每次调用按其临时构建无状态 agent 、用完即销毁， 支持并发

t2i 示例 （百炼）：

t2i 示例 （火山方舟）：

```jsonc
{
"type"  "t2i"
"api_key": "ark-your-api-key-here", "prompt": "讲解机器人 "
}
```

t2t 示例 （model_api_type / api_key /modelname/ base_url 必填， 每次按入参模型临时建 agent 、调用完销毁 、支持并发）：

```jsonc
{
"type"  "t2t"
"model_api_type": "openai",
"base_url": "",
"api_key": "sk-your-api-key-here",
"model_name": "qwen3.5-flash",
"prompt": "面向5-12岁儿童的科普讲解助手，语气活泼 、用类比代替术语，回答控制在3句话内 "
}
```

result 结构（按 type 只填对应字段）： t2i：

```jsonc
{
"type"  "t2i"
"image": {
"channel": "aliyun_bailian",
"request_id": null,
"model": "z-image-turbo",
"size"  "1120*1440"
"image_count": 3,
"images": [
{
"index": 1,
"url": "",
"image_type": "url"
}
]
}
}
```

t2t：

```jsonc
{
"type"  "t2t"
"text": "你是一名面向  5-12 岁儿童的科普讲解机器人。语气活泼 、亲切， 多用类比少用专业术语； 每次回答不超过  3 句话； 遇到不确定的问题主动说『让我去查一下』 。 "
}
```

### 知识库嵌入 knowledge_embed

下载文档列表后嵌入到指定知识库（pgvector 向量表）， 支持全量 / 增量两种方式，文件格式支持 pdf /docx / xlsx / csv / txt / md （按 URL 中的文件扩展名选择解析器）。

command_param：

```jsonc
{
"knowledge_id": "agent",
"file_urls": [
"任务参数.pdf",
""
],
"embed_type": "full" }
```

knowledge_id：知识库 ID， 直接作为 pgvector 表名 （仅允许字母、数字、下划线， 须以字母或下划线开头， 长度不超过 63）

file_urls：文档下载地址列表， URL 路径须以带扩展名的文件名结尾

embed_type： full=全量 （先清空知识库再嵌入， 默认）； increment=增量追加。同一知识库同时只允许一个嵌入任务

嵌入执行中可通过 task_status_query 按本任务 task_id 查询实时进度 （embedding_progress），任务结束后保留最终进度。

result 结构：

```jsonc
{
"knowledge_id": "agent",
"embed_type": "full",
"file_count": 2,
"total_chunks": 171,
"progress": {
"status"  "COMPLETED"
"error": null,
"files": [
{"fileName": "agent任务参数.pdf", "totalChunks": 116, "doneChunks": 116,
"percent": 100},
{"fileName": "bwt.docx", "totalChunks": 55, "doneChunks": 55, "percent": 100}
]
}
}
```

### 知识库同步 knowledge_sync

```jsonc
{
"action_type": "upload",
"knowledge_id": "agent",
"download_url": ""
}
```

action_type： 支持  upload (上传并导出知识库表) 或  download (下载并在本地清空恢复该知识库)

knowledge_id：要同步的知识库 ID （即本地 pgvector 对应的表名）

download_url： 当  action_type 为  download 时必须提供，表示从哪里下载知识库 CSV 备份文件
