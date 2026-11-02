-- Material Studio 模板种子数据
USE material_studio;

DELETE FROM template;

INSERT INTO template
(id, title, description, channel, category, cover_url, result_url, required_image_count, accepted_mime_types, max_file_size_bytes, sort_order, enabled)
VALUES
('tpl-pet-wiggle',     '萌宠摇摆舞',       '上传一张宠物照片，模拟生成会跳舞的萌宠视频封面。',   'video', '萌宠',       '/demo/tpl-pet-wiggle.svg',    '/demo/res-pet-wiggle.svg',    1, 'image/jpeg,image/png,image/webp', 5242880, 10, 1),
('tpl-santa-hug',      'AI圣诞抱抱',       '上传一张人像照片，模拟生成圣诞老人拥抱贺卡。',       'video', '热门',       '/demo/tpl-santa-hug.svg',     '/demo/res-santa-hug.svg',     1, 'image/jpeg,image/png,image/webp', 5242880, 20, 1),
('tpl-wedding-film',   '婚礼请柬',         '上传情侣合照，模拟生成电子婚礼请柬。',               'video', '求婚婚庆',   '/demo/tpl-wedding-film.svg',  '/demo/res-wedding-film.svg',  2, 'image/jpeg,image/png,image/webp', 5242880, 30, 1),
('tpl-travel-postcard','复古旅行明信片',   '上传旅行照片，模拟生成复古风旅行明信片。',           'video', '创意',       '/demo/tpl-postcard.svg',      '/demo/res-postcard.svg',      2, 'image/jpeg,image/png,image/webp', 5242880, 40, 1),
('tpl-ice-queen',      '冰雪女王写真',     '上传一张人像，模拟生成冰雪奇幻风格写真。',           'video', '热门',       '/demo/tpl-ice-queen.svg',     '/demo/res-ice-queen.svg',     1, 'image/jpeg,image/png,image/webp', 5242880, 50, 1),
('tpl-island-breeze',  '海岛微风',         '上传一张风景照，模拟生成海边艺术挂画。',             'video', '风景',       '/demo/tpl-island.svg',        '/demo/res-island.svg',        1, 'image/jpeg,image/png,image/webp', 5242880, 60, 1),
('tpl-city-skyline',   '城市霓虹天际线',   '上传一张城市照片，模拟生成霓虹天际线海报。',         'video', '风景',       '/demo/tpl-city.svg',          '/demo/res-city.svg',          1, 'image/jpeg,image/png,image/webp', 5242880, 70, 1),
('tpl-portrait-pro',   '人像大师滤镜',     '上传一张自拍，模拟生成影棚级人像大片。',             'video', '热门',       '/demo/tpl-portrait.svg',      '/demo/res-portrait.svg',      1, 'image/jpeg,image/png,image/webp', 5242880, 80, 1),
('tpl-flow-style',     '批量风格迁移',     '工作流：上传多张照片，模拟生成统一风格的图集。',     'workflow', '创意',    '/demo/tpl-flow-style.svg',    '/demo/res-flow-style.svg',    2, 'image/jpeg,image/png,image/webp', 5242880, 10, 1),
('tpl-flow-caption',   '自动字幕卡片',     '工作流：上传一张图片，模拟生成配字卡片。',           'workflow', '创意',    '/demo/tpl-flow-caption.svg',  '/demo/res-flow-caption.svg',  1, 'image/jpeg,image/png,image/webp', 5242880, 20, 1);
