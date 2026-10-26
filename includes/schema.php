<?php
/* Database tables + demo data. install.php isko chalata hai. */

function create_tables(string $driver): void {
    $id = $driver === 'sqlite' ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT UNSIGNED AUTO_INCREMENT PRIMARY KEY';
    $end = $driver === 'sqlite' ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    $sql = [
        "CREATE TABLE IF NOT EXISTS admins (id $id, username VARCHAR(60) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, created_at DATETIME NOT NULL)$end",
        "CREATE TABLE IF NOT EXISTS products (id $id, title VARCHAR(200) NOT NULL, description TEXT, cat VARCHAR(20) NOT NULL DEFAULT 'edu',
            price INT NOT NULL DEFAULT 0, mrp INT NOT NULL DEFAULT 0, slides INT NOT NULL DEFAULT 0,
            lang VARCHAR(30) NOT NULL DEFAULT 'English', theme VARCHAR(10) NOT NULL DEFAULT 'Dark', board VARCHAR(255) NOT NULL DEFAULT '',
            level VARCHAR(255) NOT NULL DEFAULT '', subject VARCHAR(100) NOT NULL DEFAULT '', anim TINYINT NOT NULL DEFAULT 0,
            badge VARCHAR(10) NOT NULL DEFAULT '', color1 VARCHAR(9) NOT NULL DEFAULT '#8b2cff', color2 VARCHAR(9) NOT NULL DEFAULT '#06b6d4',
            thumb VARCHAR(255) NOT NULL DEFAULT '', previews TEXT, file_path VARCHAR(255) NOT NULL DEFAULT '', file_name VARCHAR(255) NOT NULL DEFAULT '',
            sales_base INT NOT NULL DEFAULT 0, active TINYINT NOT NULL DEFAULT 1, sort INT NOT NULL DEFAULT 0, created_at DATETIME NOT NULL)$end",
        "CREATE TABLE IF NOT EXISTS orders (id $id, name VARCHAR(120) NOT NULL, email VARCHAR(190) NOT NULL, phone VARCHAR(20) NOT NULL,
            items TEXT NOT NULL, amount INT NOT NULL, rzp_order_id VARCHAR(64) NOT NULL DEFAULT '', rzp_payment_id VARCHAR(64) NOT NULL DEFAULT '',
            status VARCHAR(12) NOT NULL DEFAULT 'created', method VARCHAR(10) NOT NULL DEFAULT 'razorpay', utr VARCHAR(40) NOT NULL DEFAULT '',
            proof VARCHAR(255) NOT NULL DEFAULT '', created_at DATETIME NOT NULL, paid_at DATETIME NULL)$end",
        "CREATE TABLE IF NOT EXISTS settings (name VARCHAR(50) NOT NULL PRIMARY KEY, value TEXT)$end",
        "CREATE TABLE IF NOT EXISTS downloads (id $id, order_id INT NOT NULL, product_id INT NOT NULL, token VARCHAR(48) NOT NULL UNIQUE,
            count INT NOT NULL DEFAULT 0, expires_at DATETIME NOT NULL, created_at DATETIME NOT NULL)$end",
        "CREATE TABLE IF NOT EXISTS reviews (id $id, name VARCHAR(120) NOT NULL, role VARCHAR(150) NOT NULL DEFAULT '', deck VARCHAR(200) NOT NULL DEFAULT '',
            stars INT NOT NULL DEFAULT 5, text TEXT NOT NULL, approved TINYINT NOT NULL DEFAULT 0, created_at DATETIME NOT NULL)$end",
        "CREATE TABLE IF NOT EXISTS messages (id $id, name VARCHAR(120) NOT NULL, email VARCHAR(190) NOT NULL, phone VARCHAR(30) NOT NULL DEFAULT '',
            subject VARCHAR(150) NOT NULL DEFAULT '', message TEXT NOT NULL, is_read TINYINT NOT NULL DEFAULT 0, created_at DATETIME NOT NULL)$end",
        "CREATE TABLE IF NOT EXISTS requests (id $id, source VARCHAR(30) NOT NULL DEFAULT 'website', name VARCHAR(120) NOT NULL, phone VARCHAR(20) NOT NULL,
            topic VARCHAR(200) NOT NULL DEFAULT '', slides VARCHAR(40) NOT NULL DEFAULT '', language VARCHAR(40) NOT NULL DEFAULT '',
            requirements TEXT, files TEXT, status VARCHAR(12) NOT NULL DEFAULT 'new', created_at DATETIME NOT NULL)$end",
        "CREATE TABLE IF NOT EXISTS themes (id $id, name VARCHAR(150) NOT NULL, tone VARCHAR(10) NOT NULL DEFAULT 'Dark', type VARCHAR(40) NOT NULL DEFAULT 'Theory',
            lang VARCHAR(10) NOT NULL DEFAULT 'English', slides TEXT, active TINYINT NOT NULL DEFAULT 1, sort INT NOT NULL DEFAULT 0, created_at DATETIME NOT NULL)$end",
    ];
    foreach ($sql as $s) db()->exec($s);
}

/* 5 demo PPTs. Asli .pptx files demo/ folder se storage/ppt/ mein copy hoti hain. */
function demo_products(): array {
    return [
        ['Photosynthesis — Class 10 Science', 'Photosynthesis ka poora chapter: equation, chloroplast, light & dark reactions, diagram aur 5 practice questions.', 'edu', 49, 99, 10, 'English', 'Dark', 'CBSE,State Board', 'Class 10', 'Biology', 0, 'best', '#065f46', '#22c55e', 'photosynthesis'],
        ['भारत का संविधान — Class 8 SST', 'संविधान की प्रस्तावना, मौलिक अधिकार, मौलिक कर्तव्य और संसद — आसान हिंदी में, प्रश्नों के साथ।', 'edu', 39, 79, 10, 'Hindi', 'Light', 'CBSE,State Board', 'Class 8', 'Political Science / Civics', 0, 'new', '#ea580c', '#f59e0b', 'samvidhan'],
        ["Newton's Laws of Motion — Class 9", "Teeno laws, inertia, momentum, F = ma ke solved numericals aur daily-life examples. Theory + Questions.", 'edu', 59, 119, 10, 'Both', 'Dark', 'CBSE,ICSE', 'Class 9', 'Physics', 0, 'feat', '#1e3a8a', '#06b6d4', 'newton'],
        ['Fractions Made Easy — Class 5 Maths', 'Bachchon ke liye rangeen slides: fraction kya hai, like/unlike fractions, jodna-ghatana aur quiz.', 'edu', 29, 59, 10, 'Both', 'Light', 'CBSE,State Board', 'Class 5', 'Mathematics', 0, '', '#7c3aed', '#ec4899', 'fractions'],
        ['Startup Business Plan Pitch Deck', 'Investor-ready pitch deck: problem, solution, market size, business model, roadmap aur team slides. Fully editable.', 'biz', 99, 199, 10, 'English', 'Dark', 'Corporate', 'Other', 'Business', 0, 'feat', '#0f172a', '#8b2cff', 'pitch'],
    ];
}
function seed_products(): void {
    $dst = ROOT . '/storage/ppt';
    if (!is_dir($dst)) mkdir($dst, 0755, true);
    foreach (demo_products() as $i => [$title, $desc, $cat, $price, $mrp, $slides, $lang, $theme, $board, $level, $subject, $anim, $badge, $c1, $c2, $slug]) {
        $file = '';
        $src = ROOT . "/demo/ppt/$slug.pptx";
        if (is_file($src)) { $file = rand_name('pptx'); copy($src, "$dst/$file"); }
        $prev = [];
        for ($k = 1; $k <= 4; $k++) if (is_file(ROOT . "/uploads/previews/demo-$slug-$k.webp")) $prev[] = "uploads/previews/demo-$slug-$k.webp";
        q('INSERT INTO products (title,description,cat,price,mrp,slides,lang,theme,board,level,subject,anim,badge,color1,color2,thumb,previews,file_path,file_name,sales_base,active,sort,created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,1,?,?)',
          [$title, $desc, $cat, $price, $mrp, $slides, $lang, $theme, $board, $level, $subject, $anim, $badge, $c1, $c2,
           $prev[0] ?? '', json_encode($prev), $file, $file ? "$slug.pptx" : '', $i, now()]);
    }
}

/* 19 theme samples — sirf wahi daalta hai jinki images uploads/themes/samples/ mein maujood hain */
function seed_themes(): void {
    $list = [
        ['black-bilingual-questions','Black Bilingual Questions','Dark','Questions','Both',1], ['red-flash-concept','Red Flash Concept','Dark','Theory','English',1],
        ['navy-classroom','Navy Classroom','Dark','Theory + Questions','English',2], ['ocean-blue-maths','Ocean Blue Maths','Dark','Theory + Questions','Both',4],
        ['royal-blue-science','Royal Blue Science','Dark','Theory + Questions','English',4], ['blue-red-gradient','Blue & Red Gradient','Dark','Theory + Questions','Both',4],
        ['orange-corporate-training','Orange Corporate Training','White','Theory','English',4], ['green-chalkboard-biology','Green Chalkboard Biology','Dark','Theory','English',3],
        ['dark-bilingual-screenshot','Dark Bilingual Screenshot','Dark','Screenshot','Both',4], ['purple-grammar','Purple Grammar','Dark','Theory','English',2],
        ['kids-grammar-bright','Kids Grammar Bright','White','Theory','English',5], ['kids-grammar-purple','Kids Grammar Purple','Dark','Theory','English',4],
        ['hindi-marathon-pyq','Hindi Marathon PYQ','Dark','Theory + Questions','Hindi',4], ['teal-practice-questions','Teal Practice Questions','Dark','Theory + Questions','Both',2],
        ['light-paper-science','Light Paper Science','White','Theory','Hindi',4], ['mission-navodaya-mat','Mission Navodaya MAT','Dark','Questions','Both',3],
        ['dark-chalk-physics','Dark Chalk Physics','Dark','Theory + Questions','English',4], ['blackboard-theory-quiz','Blackboard Theory & Quiz','Dark','Theory + Questions','English',2],
        ['formula-board-maths','Formula Board Maths','Dark','Theory','English',4],
    ];
    foreach ($list as $i => [$slug, $name, $tone, $type, $lang, $n]) {
        $slides = [];
        for ($k = 1; $k <= $n; $k++) if (is_file(ROOT . "/uploads/themes/samples/$slug-$k.webp")) $slides[] = "uploads/themes/samples/$slug-$k.webp";
        if (!$slides) continue;
        q('INSERT INTO themes (name,tone,type,lang,slides,active,sort,created_at) VALUES (?,?,?,?,?,1,?,?)', [$name, $tone, $type, $lang, json_encode($slides), $i, now()]);
    }
}
