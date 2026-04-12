
namespace WindowsFormsApp1
{
    partial class Form1
    {
        /// <summary>
        /// 필수 디자이너 변수입니다.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// 사용 중인 모든 리소스를 정리합니다.
        /// </summary>
        /// <param name="disposing">관리되는 리소스를 삭제해야 하면 true이고, 그렇지 않으면 false입니다.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form 디자이너에서 생성한 코드

        /// <summary>
        /// 디자이너 지원에 필요한 메서드입니다. 
        /// 이 메서드의 내용을 코드 편집기로 수정하지 마세요.
        /// </summary>
        private void InitializeComponent()
        {
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(Form1));
            this.ID_label = new System.Windows.Forms.Label();
            this.PW_label = new System.Windows.Forms.Label();
            this.id_input = new System.Windows.Forms.TextBox();
            this.pw_input = new System.Windows.Forms.TextBox();
            this.login_btn = new System.Windows.Forms.Button();
            this.log_text = new System.Windows.Forms.TextBox();
            this.label1 = new System.Windows.Forms.Label();
            this.label2 = new System.Windows.Forms.Label();
            this.target_keywords_label = new System.Windows.Forms.Label();
            this.label3 = new System.Windows.Forms.Label();
            this.extract_keyword_list = new System.Windows.Forms.ListBox();
            this.except_keyword_list = new System.Windows.Forms.ListBox();
            this.label4 = new System.Windows.Forms.Label();
            this.label7 = new System.Windows.Forms.Label();
            this.timeBox = new System.Windows.Forms.ComboBox();
            this.save_btn = new System.Windows.Forms.Button();
            this.label8 = new System.Windows.Forms.Label();
            this.extract_keyword_input = new System.Windows.Forms.TextBox();
            this.target_url_input = new System.Windows.Forms.TextBox();
            this.target_url_setting_btn = new System.Windows.Forms.Button();
            this.except_keyword_input = new System.Windows.Forms.TextBox();
            this.extract_keyword_add_btn = new System.Windows.Forms.Button();
            this.except_keyword_add_btn = new System.Windows.Forms.Button();
            this.extract_file_select_btn = new System.Windows.Forms.Button();
            this.except_file_select_btn = new System.Windows.Forms.Button();
            this.extract_id_btn = new System.Windows.Forms.Button();
            this.extract_db_btn = new System.Windows.Forms.Button();
            this.reset_btn = new System.Windows.Forms.Button();
            this.save_input_btn = new System.Windows.Forms.Button();
            this.radioButton1 = new System.Windows.Forms.RadioButton();
            this.radioButton2 = new System.Windows.Forms.RadioButton();
            this.option_panel_1 = new System.Windows.Forms.Panel();
            this.radioButton3 = new System.Windows.Forms.RadioButton();
            this.radioButton4 = new System.Windows.Forms.RadioButton();
            this.radioButton5 = new System.Windows.Forms.RadioButton();
            this.radioButton6 = new System.Windows.Forms.RadioButton();
            this.radioButton7 = new System.Windows.Forms.RadioButton();
            this.start_date = new System.Windows.Forms.DateTimePicker();
            this.end_date = new System.Windows.Forms.DateTimePicker();
            this.start_page = new System.Windows.Forms.NumericUpDown();
            this.end_page = new System.Windows.Forms.NumericUpDown();
            this.label5 = new System.Windows.Forms.Label();
            this.label6 = new System.Windows.Forms.Label();
            this.option_panel_2 = new System.Windows.Forms.Panel();
            this.radioButton8 = new System.Windows.Forms.RadioButton();
            this.radioButton9 = new System.Windows.Forms.RadioButton();
            this.option_panel_3 = new System.Windows.Forms.Panel();
            this.cafe_url_radio = new System.Windows.Forms.RadioButton();
            this.article_url_radio = new System.Windows.Forms.RadioButton();
            this.target_url_panel = new System.Windows.Forms.Panel();
            this.tableLayoutPanel1 = new System.Windows.Forms.TableLayoutPanel();
            this.label14 = new System.Windows.Forms.Label();
            this.logout = new System.Windows.Forms.Label();
            this.QnA_label = new System.Windows.Forms.Label();
            this.label9 = new System.Windows.Forms.Label();
            this.manage_left_time_label = new System.Windows.Forms.Label();
            this.manage_my_page_label = new System.Windows.Forms.Label();
            this.option_panel_1.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.start_page)).BeginInit();
            ((System.ComponentModel.ISupportInitialize)(this.end_page)).BeginInit();
            this.option_panel_2.SuspendLayout();
            this.option_panel_3.SuspendLayout();
            this.target_url_panel.SuspendLayout();
            this.tableLayoutPanel1.SuspendLayout();
            this.SuspendLayout();
            // 
            // ID_label
            // 
            this.ID_label.AutoSize = true;
            this.ID_label.Font = new System.Drawing.Font("굴림", 9F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(129)));
            this.ID_label.ForeColor = System.Drawing.Color.MediumAquamarine;
            this.ID_label.Location = new System.Drawing.Point(110, 43);
            this.ID_label.Name = "ID_label";
            this.ID_label.Size = new System.Drawing.Size(69, 12);
            this.ID_label.TabIndex = 0;
            this.ID_label.Text = "아이디   : ";
            this.ID_label.Click += new System.EventHandler(this.ID_label_Click);
            // 
            // PW_label
            // 
            this.PW_label.AutoSize = true;
            this.PW_label.Font = new System.Drawing.Font("굴림", 9F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(129)));
            this.PW_label.ForeColor = System.Drawing.Color.MediumAquamarine;
            this.PW_label.Location = new System.Drawing.Point(110, 79);
            this.PW_label.Name = "PW_label";
            this.PW_label.Size = new System.Drawing.Size(72, 12);
            this.PW_label.TabIndex = 1;
            this.PW_label.Text = "비밀번호 : ";
            // 
            // id_input
            // 
            this.id_input.ForeColor = System.Drawing.Color.DeepSkyBlue;
            this.id_input.Location = new System.Drawing.Point(188, 39);
            this.id_input.Name = "id_input";
            this.id_input.Size = new System.Drawing.Size(100, 21);
            this.id_input.TabIndex = 2;
            this.id_input.TextChanged += new System.EventHandler(this.textBox1_TextChanged);
            // 
            // pw_input
            // 
            this.pw_input.ForeColor = System.Drawing.Color.DeepSkyBlue;
            this.pw_input.Location = new System.Drawing.Point(188, 75);
            this.pw_input.Name = "pw_input";
            this.pw_input.PasswordChar = '*';
            this.pw_input.Size = new System.Drawing.Size(100, 21);
            this.pw_input.TabIndex = 4;
            // 
            // login_btn
            // 
            this.login_btn.Font = new System.Drawing.Font("굴림", 9F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(129)));
            this.login_btn.ForeColor = System.Drawing.Color.MediumAquamarine;
            this.login_btn.Location = new System.Drawing.Point(304, 39);
            this.login_btn.Name = "login_btn";
            this.login_btn.Size = new System.Drawing.Size(74, 57);
            this.login_btn.TabIndex = 5;
            this.login_btn.Text = "로그인";
            this.login_btn.UseVisualStyleBackColor = true;
            this.login_btn.Click += new System.EventHandler(this.button1_Click);
            // 
            // log_text
            // 
            this.log_text.Location = new System.Drawing.Point(569, 38);
            this.log_text.Multiline = true;
            this.log_text.Name = "log_text";
            this.log_text.ReadOnly = true;
            this.log_text.Size = new System.Drawing.Size(219, 348);
            this.log_text.TabIndex = 6;
            this.log_text.TextChanged += new System.EventHandler(this.textBox1_TextChanged_1);
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.Font = new System.Drawing.Font("굴림", 10F, System.Drawing.FontStyle.Bold);
            this.label1.ForeColor = System.Drawing.Color.CornflowerBlue;
            this.label1.Location = new System.Drawing.Point(108, 12);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(52, 14);
            this.label1.TabIndex = 7;
            this.label1.Text = "로그인";
            // 
            // label2
            // 
            this.label2.AutoSize = true;
            this.label2.Font = new System.Drawing.Font("굴림", 10F, System.Drawing.FontStyle.Bold);
            this.label2.ForeColor = System.Drawing.Color.CornflowerBlue;
            this.label2.Location = new System.Drawing.Point(566, 11);
            this.label2.Name = "label2";
            this.label2.Size = new System.Drawing.Size(73, 14);
            this.label2.TabIndex = 8;
            this.label2.Text = "작업 내역";
            this.label2.Click += new System.EventHandler(this.label2_Click);
            // 
            // target_keywords_label
            // 
            this.target_keywords_label.AutoSize = true;
            this.target_keywords_label.Font = new System.Drawing.Font("굴림", 10F, System.Drawing.FontStyle.Bold);
            this.target_keywords_label.ForeColor = System.Drawing.Color.CornflowerBlue;
            this.target_keywords_label.Location = new System.Drawing.Point(109, 111);
            this.target_keywords_label.Name = "target_keywords_label";
            this.target_keywords_label.Size = new System.Drawing.Size(154, 14);
            this.target_keywords_label.TabIndex = 9;
            this.target_keywords_label.Text = "추출대상 키워드 등록";
            this.target_keywords_label.Click += new System.EventHandler(this.label3_Click);
            // 
            // label3
            // 
            this.label3.AutoSize = true;
            this.label3.Font = new System.Drawing.Font("굴림", 10F, System.Drawing.FontStyle.Bold);
            this.label3.ForeColor = System.Drawing.Color.CornflowerBlue;
            this.label3.Location = new System.Drawing.Point(109, 254);
            this.label3.Name = "label3";
            this.label3.Size = new System.Drawing.Size(124, 14);
            this.label3.TabIndex = 10;
            this.label3.Text = "제외 키워드 등록";
            // 
            // extract_keyword_list
            // 
            this.extract_keyword_list.FormattingEnabled = true;
            this.extract_keyword_list.HorizontalScrollbar = true;
            this.extract_keyword_list.ItemHeight = 12;
            this.extract_keyword_list.Location = new System.Drawing.Point(112, 159);
            this.extract_keyword_list.Name = "extract_keyword_list";
            this.extract_keyword_list.Size = new System.Drawing.Size(176, 88);
            this.extract_keyword_list.TabIndex = 11;
            // 
            // except_keyword_list
            // 
            this.except_keyword_list.FormattingEnabled = true;
            this.except_keyword_list.HorizontalScrollbar = true;
            this.except_keyword_list.ItemHeight = 12;
            this.except_keyword_list.Location = new System.Drawing.Point(112, 301);
            this.except_keyword_list.Name = "except_keyword_list";
            this.except_keyword_list.Size = new System.Drawing.Size(176, 76);
            this.except_keyword_list.TabIndex = 12;
            // 
            // label4
            // 
            this.label4.AutoSize = true;
            this.label4.Font = new System.Drawing.Font("굴림", 10F, System.Drawing.FontStyle.Bold);
            this.label4.ForeColor = System.Drawing.Color.CornflowerBlue;
            this.label4.Location = new System.Drawing.Point(309, 111);
            this.label4.Name = "label4";
            this.label4.Size = new System.Drawing.Size(109, 14);
            this.label4.TabIndex = 13;
            this.label4.Text = "옵션 세부 설정";
            this.label4.Click += new System.EventHandler(this.label4_Click);
            // 
            // label7
            // 
            this.label7.AutoSize = true;
            this.label7.Location = new System.Drawing.Point(311, 277);
            this.label7.Name = "label7";
            this.label7.Size = new System.Drawing.Size(65, 12);
            this.label7.TabIndex = 27;
            this.label7.Text = "저장타이머";
            this.label7.Click += new System.EventHandler(this.label7_Click);
            // 
            // timeBox
            // 
            this.timeBox.FormattingEnabled = true;
            this.timeBox.Location = new System.Drawing.Point(382, 273);
            this.timeBox.Name = "timeBox";
            this.timeBox.Size = new System.Drawing.Size(100, 20);
            this.timeBox.TabIndex = 28;
            this.timeBox.Text = "1시간";
            this.timeBox.SelectedIndexChanged += new System.EventHandler(this.comboBox1_SelectedIndexChanged);
            // 
            // save_btn
            // 
            this.save_btn.Location = new System.Drawing.Point(488, 272);
            this.save_btn.Name = "save_btn";
            this.save_btn.Size = new System.Drawing.Size(63, 23);
            this.save_btn.TabIndex = 29;
            this.save_btn.Text = "시작";
            this.save_btn.UseVisualStyleBackColor = true;
            this.save_btn.Click += new System.EventHandler(this.Save_extracted_data);
            // 
            // label8
            // 
            this.label8.AutoSize = true;
            this.label8.Font = new System.Drawing.Font("굴림", 10F, System.Drawing.FontStyle.Bold);
            this.label8.ForeColor = System.Drawing.Color.CornflowerBlue;
            this.label8.Location = new System.Drawing.Point(310, 325);
            this.label8.Name = "label8";
            this.label8.Size = new System.Drawing.Size(109, 14);
            this.label8.TabIndex = 32;
            this.label8.Text = "타겟 주소 입력";
            this.label8.Click += new System.EventHandler(this.label8_Click);
            // 
            // extract_keyword_input
            // 
            this.extract_keyword_input.Location = new System.Drawing.Point(112, 132);
            this.extract_keyword_input.Name = "extract_keyword_input";
            this.extract_keyword_input.Size = new System.Drawing.Size(121, 21);
            this.extract_keyword_input.TabIndex = 35;
            // 
            // target_url_input
            // 
            this.target_url_input.Location = new System.Drawing.Point(313, 383);
            this.target_url_input.Name = "target_url_input";
            this.target_url_input.Size = new System.Drawing.Size(169, 21);
            this.target_url_input.TabIndex = 36;
            // 
            // target_url_setting_btn
            // 
            this.target_url_setting_btn.Location = new System.Drawing.Point(488, 381);
            this.target_url_setting_btn.Name = "target_url_setting_btn";
            this.target_url_setting_btn.Size = new System.Drawing.Size(63, 23);
            this.target_url_setting_btn.TabIndex = 37;
            this.target_url_setting_btn.Text = "적용";
            this.target_url_setting_btn.UseVisualStyleBackColor = true;
            this.target_url_setting_btn.Click += new System.EventHandler(this.Setting_target_url);
            // 
            // except_keyword_input
            // 
            this.except_keyword_input.Location = new System.Drawing.Point(112, 274);
            this.except_keyword_input.Name = "except_keyword_input";
            this.except_keyword_input.Size = new System.Drawing.Size(121, 21);
            this.except_keyword_input.TabIndex = 38;
            // 
            // extract_keyword_add_btn
            // 
            this.extract_keyword_add_btn.Location = new System.Drawing.Point(239, 130);
            this.extract_keyword_add_btn.Name = "extract_keyword_add_btn";
            this.extract_keyword_add_btn.Size = new System.Drawing.Size(49, 23);
            this.extract_keyword_add_btn.TabIndex = 39;
            this.extract_keyword_add_btn.Text = "추가";
            this.extract_keyword_add_btn.UseVisualStyleBackColor = true;
            this.extract_keyword_add_btn.Click += new System.EventHandler(this.Add_extract_keywords);
            // 
            // except_keyword_add_btn
            // 
            this.except_keyword_add_btn.Location = new System.Drawing.Point(239, 272);
            this.except_keyword_add_btn.Name = "except_keyword_add_btn";
            this.except_keyword_add_btn.Size = new System.Drawing.Size(49, 23);
            this.except_keyword_add_btn.TabIndex = 40;
            this.except_keyword_add_btn.Text = "추가";
            this.except_keyword_add_btn.UseVisualStyleBackColor = true;
            this.except_keyword_add_btn.Click += new System.EventHandler(this.Add_except_keywords);
            // 
            // extract_file_select_btn
            // 
            this.extract_file_select_btn.BackgroundImage = ((System.Drawing.Image)(resources.GetObject("extract_file_select_btn.BackgroundImage")));
            this.extract_file_select_btn.Cursor = System.Windows.Forms.Cursors.Default;
            this.extract_file_select_btn.Location = new System.Drawing.Point(213, 132);
            this.extract_file_select_btn.Name = "extract_file_select_btn";
            this.extract_file_select_btn.Size = new System.Drawing.Size(20, 19);
            this.extract_file_select_btn.TabIndex = 41;
            this.extract_file_select_btn.UseVisualStyleBackColor = true;
            this.extract_file_select_btn.Click += new System.EventHandler(this.extract_file_select);
            // 
            // except_file_select_btn
            // 
            this.except_file_select_btn.BackgroundImage = ((System.Drawing.Image)(resources.GetObject("except_file_select_btn.BackgroundImage")));
            this.except_file_select_btn.Location = new System.Drawing.Point(213, 274);
            this.except_file_select_btn.Name = "except_file_select_btn";
            this.except_file_select_btn.Size = new System.Drawing.Size(20, 19);
            this.except_file_select_btn.TabIndex = 42;
            this.except_file_select_btn.UseVisualStyleBackColor = true;
            this.except_file_select_btn.Click += new System.EventHandler(this.except_file_select);
            // 
            // extract_id_btn
            // 
            this.extract_id_btn.Location = new System.Drawing.Point(112, 383);
            this.extract_id_btn.Name = "extract_id_btn";
            this.extract_id_btn.Size = new System.Drawing.Size(75, 37);
            this.extract_id_btn.TabIndex = 43;
            this.extract_id_btn.Text = "아이디\r\n추출시작";
            this.extract_id_btn.UseVisualStyleBackColor = true;
            this.extract_id_btn.Click += new System.EventHandler(this.extract_id_thread);
            // 
            // extract_db_btn
            // 
            this.extract_db_btn.Location = new System.Drawing.Point(213, 383);
            this.extract_db_btn.Name = "extract_db_btn";
            this.extract_db_btn.Size = new System.Drawing.Size(75, 37);
            this.extract_db_btn.TabIndex = 44;
            this.extract_db_btn.Text = "DB정보\r\n추출시작";
            this.extract_db_btn.UseVisualStyleBackColor = true;
            this.extract_db_btn.Click += new System.EventHandler(this.extract_db_btn_Click);
            // 
            // reset_btn
            // 
            this.reset_btn.Location = new System.Drawing.Point(651, 398);
            this.reset_btn.Name = "reset_btn";
            this.reset_btn.Size = new System.Drawing.Size(63, 23);
            this.reset_btn.TabIndex = 45;
            this.reset_btn.Text = "초기화";
            this.reset_btn.UseVisualStyleBackColor = true;
            this.reset_btn.Click += new System.EventHandler(this.reset_data);
            // 
            // save_input_btn
            // 
            this.save_input_btn.Location = new System.Drawing.Point(725, 398);
            this.save_input_btn.Name = "save_input_btn";
            this.save_input_btn.Size = new System.Drawing.Size(63, 23);
            this.save_input_btn.TabIndex = 46;
            this.save_input_btn.Text = "저장하기";
            this.save_input_btn.UseVisualStyleBackColor = true;
            this.save_input_btn.Click += new System.EventHandler(this.save_data);
            // 
            // radioButton1
            // 
            this.radioButton1.AutoSize = true;
            this.radioButton1.Checked = true;
            this.radioButton1.Location = new System.Drawing.Point(41, 6);
            this.radioButton1.Name = "radioButton1";
            this.radioButton1.Size = new System.Drawing.Size(71, 16);
            this.radioButton1.TabIndex = 49;
            this.radioButton1.TabStop = true;
            this.radioButton1.Text = "관련도순";
            this.radioButton1.UseVisualStyleBackColor = true;
            // 
            // radioButton2
            // 
            this.radioButton2.AutoSize = true;
            this.radioButton2.Location = new System.Drawing.Point(139, 6);
            this.radioButton2.Name = "radioButton2";
            this.radioButton2.Size = new System.Drawing.Size(59, 16);
            this.radioButton2.TabIndex = 50;
            this.radioButton2.Text = "최신순";
            this.radioButton2.UseVisualStyleBackColor = true;
            // 
            // option_panel_1
            // 
            this.option_panel_1.Controls.Add(this.radioButton2);
            this.option_panel_1.Controls.Add(this.radioButton1);
            this.option_panel_1.Location = new System.Drawing.Point(313, 128);
            this.option_panel_1.Name = "option_panel_1";
            this.option_panel_1.Size = new System.Drawing.Size(238, 28);
            this.option_panel_1.TabIndex = 51;
            // 
            // radioButton3
            // 
            this.radioButton3.AutoSize = true;
            this.radioButton3.Checked = true;
            this.radioButton3.Location = new System.Drawing.Point(7, 4);
            this.radioButton3.Name = "radioButton3";
            this.radioButton3.Size = new System.Drawing.Size(47, 16);
            this.radioButton3.TabIndex = 27;
            this.radioButton3.TabStop = true;
            this.radioButton3.Text = "전체";
            this.radioButton3.UseVisualStyleBackColor = true;
            this.radioButton3.CheckedChanged += new System.EventHandler(this.Date_radio_button_click);
            // 
            // radioButton4
            // 
            this.radioButton4.AutoSize = true;
            this.radioButton4.Location = new System.Drawing.Point(60, 4);
            this.radioButton4.Name = "radioButton4";
            this.radioButton4.Size = new System.Drawing.Size(41, 16);
            this.radioButton4.TabIndex = 28;
            this.radioButton4.Text = "1일";
            this.radioButton4.UseVisualStyleBackColor = true;
            this.radioButton4.CheckedChanged += new System.EventHandler(this.Date_radio_button_click);
            // 
            // radioButton5
            // 
            this.radioButton5.AutoSize = true;
            this.radioButton5.Location = new System.Drawing.Point(107, 5);
            this.radioButton5.Name = "radioButton5";
            this.radioButton5.Size = new System.Drawing.Size(41, 16);
            this.radioButton5.TabIndex = 29;
            this.radioButton5.Text = "1주";
            this.radioButton5.UseVisualStyleBackColor = true;
            this.radioButton5.CheckedChanged += new System.EventHandler(this.Date_radio_button_click);
            // 
            // radioButton6
            // 
            this.radioButton6.AutoSize = true;
            this.radioButton6.Location = new System.Drawing.Point(154, 4);
            this.radioButton6.Name = "radioButton6";
            this.radioButton6.Size = new System.Drawing.Size(41, 16);
            this.radioButton6.TabIndex = 30;
            this.radioButton6.Text = "1년";
            this.radioButton6.UseVisualStyleBackColor = true;
            this.radioButton6.CheckedChanged += new System.EventHandler(this.Date_radio_button_click);
            // 
            // radioButton7
            // 
            this.radioButton7.AutoSize = true;
            this.radioButton7.Location = new System.Drawing.Point(201, 5);
            this.radioButton7.Name = "radioButton7";
            this.radioButton7.Size = new System.Drawing.Size(47, 16);
            this.radioButton7.TabIndex = 31;
            this.radioButton7.Text = "기타";
            this.radioButton7.UseVisualStyleBackColor = true;
            this.radioButton7.CheckedChanged += new System.EventHandler(this.Date_radio_button_click);
            // 
            // start_date
            // 
            this.start_date.Enabled = false;
            this.start_date.Location = new System.Drawing.Point(7, 27);
            this.start_date.Name = "start_date";
            this.start_date.Size = new System.Drawing.Size(116, 21);
            this.start_date.TabIndex = 32;
            // 
            // end_date
            // 
            this.end_date.Enabled = false;
            this.end_date.Location = new System.Drawing.Point(129, 27);
            this.end_date.Name = "end_date";
            this.end_date.Size = new System.Drawing.Size(116, 21);
            this.end_date.TabIndex = 33;
            // 
            // start_page
            // 
            this.start_page.Cursor = System.Windows.Forms.Cursors.Arrow;
            this.start_page.Location = new System.Drawing.Point(7, 55);
            this.start_page.Maximum = new decimal(new int[] {
            -1530494977,
            232830,
            0,
            0});
            this.start_page.Minimum = new decimal(new int[] {
            1,
            0,
            0,
            0});
            this.start_page.Name = "start_page";
            this.start_page.Size = new System.Drawing.Size(47, 21);
            this.start_page.TabIndex = 34;
            this.start_page.TextAlign = System.Windows.Forms.HorizontalAlignment.Center;
            this.start_page.Value = new decimal(new int[] {
            1,
            0,
            0,
            0});
            // 
            // end_page
            // 
            this.end_page.Cursor = System.Windows.Forms.Cursors.Arrow;
            this.end_page.Location = new System.Drawing.Point(129, 55);
            this.end_page.Maximum = new decimal(new int[] {
            -1530494977,
            232830,
            0,
            0});
            this.end_page.Minimum = new decimal(new int[] {
            1,
            0,
            0,
            0});
            this.end_page.Name = "end_page";
            this.end_page.Size = new System.Drawing.Size(47, 21);
            this.end_page.TabIndex = 35;
            this.end_page.TextAlign = System.Windows.Forms.HorizontalAlignment.Center;
            this.end_page.Value = new decimal(new int[] {
            5,
            0,
            0,
            0});
            // 
            // label5
            // 
            this.label5.AutoSize = true;
            this.label5.Location = new System.Drawing.Point(66, 59);
            this.label5.Name = "label5";
            this.label5.Size = new System.Drawing.Size(54, 12);
            this.label5.TabIndex = 36;
            this.label5.Text = "페이지 ~";
            // 
            // label6
            // 
            this.label6.AutoSize = true;
            this.label6.Location = new System.Drawing.Point(182, 59);
            this.label6.Name = "label6";
            this.label6.Size = new System.Drawing.Size(65, 12);
            this.label6.TabIndex = 37;
            this.label6.Text = "페이지까지";
            // 
            // option_panel_2
            // 
            this.option_panel_2.Controls.Add(this.label6);
            this.option_panel_2.Controls.Add(this.label5);
            this.option_panel_2.Controls.Add(this.end_page);
            this.option_panel_2.Controls.Add(this.start_page);
            this.option_panel_2.Controls.Add(this.end_date);
            this.option_panel_2.Controls.Add(this.start_date);
            this.option_panel_2.Controls.Add(this.radioButton7);
            this.option_panel_2.Controls.Add(this.radioButton6);
            this.option_panel_2.Controls.Add(this.radioButton5);
            this.option_panel_2.Controls.Add(this.radioButton4);
            this.option_panel_2.Controls.Add(this.radioButton3);
            this.option_panel_2.Location = new System.Drawing.Point(304, 159);
            this.option_panel_2.Name = "option_panel_2";
            this.option_panel_2.Size = new System.Drawing.Size(254, 81);
            this.option_panel_2.TabIndex = 52;
            // 
            // radioButton8
            // 
            this.radioButton8.AutoSize = true;
            this.radioButton8.Checked = true;
            this.radioButton8.Location = new System.Drawing.Point(33, 4);
            this.radioButton8.Name = "radioButton8";
            this.radioButton8.Size = new System.Drawing.Size(75, 16);
            this.radioButton8.TabIndex = 51;
            this.radioButton8.TabStop = true;
            this.radioButton8.Text = "자동 저장";
            this.radioButton8.UseVisualStyleBackColor = true;
            // 
            // radioButton9
            // 
            this.radioButton9.AutoSize = true;
            this.radioButton9.Location = new System.Drawing.Point(131, 4);
            this.radioButton9.Name = "radioButton9";
            this.radioButton9.Size = new System.Drawing.Size(75, 16);
            this.radioButton9.TabIndex = 52;
            this.radioButton9.Text = "수동 저장";
            this.radioButton9.UseVisualStyleBackColor = true;
            // 
            // option_panel_3
            // 
            this.option_panel_3.Controls.Add(this.radioButton9);
            this.option_panel_3.Controls.Add(this.radioButton8);
            this.option_panel_3.Location = new System.Drawing.Point(313, 246);
            this.option_panel_3.Name = "option_panel_3";
            this.option_panel_3.Size = new System.Drawing.Size(238, 25);
            this.option_panel_3.TabIndex = 53;
            // 
            // cafe_url_radio
            // 
            this.cafe_url_radio.AutoSize = true;
            this.cafe_url_radio.Checked = true;
            this.cafe_url_radio.Location = new System.Drawing.Point(27, 8);
            this.cafe_url_radio.Name = "cafe_url_radio";
            this.cafe_url_radio.Size = new System.Drawing.Size(75, 16);
            this.cafe_url_radio.TabIndex = 35;
            this.cafe_url_radio.TabStop = true;
            this.cafe_url_radio.Text = "카페 주소";
            this.cafe_url_radio.UseVisualStyleBackColor = true;
            // 
            // article_url_radio
            // 
            this.article_url_radio.AutoSize = true;
            this.article_url_radio.Location = new System.Drawing.Point(125, 8);
            this.article_url_radio.Name = "article_url_radio";
            this.article_url_radio.Size = new System.Drawing.Size(87, 16);
            this.article_url_radio.TabIndex = 36;
            this.article_url_radio.Text = "게시판 주소";
            this.article_url_radio.UseVisualStyleBackColor = true;
            // 
            // target_url_panel
            // 
            this.target_url_panel.Controls.Add(this.article_url_radio);
            this.target_url_panel.Controls.Add(this.cafe_url_radio);
            this.target_url_panel.Location = new System.Drawing.Point(313, 343);
            this.target_url_panel.Name = "target_url_panel";
            this.target_url_panel.Size = new System.Drawing.Size(238, 32);
            this.target_url_panel.TabIndex = 54;
            // 
            // tableLayoutPanel1
            // 
            this.tableLayoutPanel1.BackColor = System.Drawing.Color.LightGray;
            this.tableLayoutPanel1.ColumnCount = 1;
            this.tableLayoutPanel1.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle(System.Windows.Forms.SizeType.Percent, 50F));
            this.tableLayoutPanel1.Controls.Add(this.label14, 0, 5);
            this.tableLayoutPanel1.Controls.Add(this.logout, 0, 4);
            this.tableLayoutPanel1.Controls.Add(this.QnA_label, 0, 3);
            this.tableLayoutPanel1.Controls.Add(this.label9, 0, 0);
            this.tableLayoutPanel1.Controls.Add(this.manage_left_time_label, 0, 1);
            this.tableLayoutPanel1.Controls.Add(this.manage_my_page_label, 0, 2);
            this.tableLayoutPanel1.ImeMode = System.Windows.Forms.ImeMode.Off;
            this.tableLayoutPanel1.Location = new System.Drawing.Point(-1, -1);
            this.tableLayoutPanel1.Name = "tableLayoutPanel1";
            this.tableLayoutPanel1.RowCount = 7;
            this.tableLayoutPanel1.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Percent, 63.52941F));
            this.tableLayoutPanel1.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Percent, 36.47059F));
            this.tableLayoutPanel1.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Absolute, 38F));
            this.tableLayoutPanel1.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Absolute, 40F));
            this.tableLayoutPanel1.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Absolute, 37F));
            this.tableLayoutPanel1.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Absolute, 59F));
            this.tableLayoutPanel1.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Absolute, 166F));
            this.tableLayoutPanel1.Size = new System.Drawing.Size(105, 451);
            this.tableLayoutPanel1.TabIndex = 55;
            // 
            // label14
            // 
            this.label14.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom) 
            | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.label14.AutoSize = true;
            this.label14.Cursor = System.Windows.Forms.Cursors.Hand;
            this.label14.Font = new System.Drawing.Font("예스체", 9F);
            this.label14.Location = new System.Drawing.Point(5, 230);
            this.label14.Margin = new System.Windows.Forms.Padding(5);
            this.label14.Name = "label14";
            this.label14.Size = new System.Drawing.Size(95, 49);
            this.label14.TabIndex = 5;
            this.label14.Text = "블로그 글쓰기 자동화";
            this.label14.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            // 
            // logout
            // 
            this.logout.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom) 
            | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.logout.AutoSize = true;
            this.logout.Cursor = System.Windows.Forms.Cursors.Hand;
            this.logout.Font = new System.Drawing.Font("예스체", 9F);
            this.logout.Location = new System.Drawing.Point(5, 193);
            this.logout.Margin = new System.Windows.Forms.Padding(5);
            this.logout.Name = "logout";
            this.logout.Size = new System.Drawing.Size(95, 27);
            this.logout.TabIndex = 4;
            this.logout.Text = "로그아웃";
            this.logout.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            // 
            // QnA_label
            // 
            this.QnA_label.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom) 
            | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.QnA_label.AutoSize = true;
            this.QnA_label.Cursor = System.Windows.Forms.Cursors.Hand;
            this.QnA_label.Font = new System.Drawing.Font("예스체", 9F);
            this.QnA_label.Location = new System.Drawing.Point(5, 153);
            this.QnA_label.Margin = new System.Windows.Forms.Padding(5);
            this.QnA_label.Name = "QnA_label";
            this.QnA_label.Size = new System.Drawing.Size(95, 30);
            this.QnA_label.TabIndex = 3;
            this.QnA_label.Text = "문의하기";
            this.QnA_label.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            this.QnA_label.Click += new System.EventHandler(this.Get_QnA);
            // 
            // label9
            // 
            this.label9.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom) 
            | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.label9.AutoSize = true;
            this.label9.Font = new System.Drawing.Font("예스체", 9F, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, ((byte)(129)));
            this.label9.Location = new System.Drawing.Point(10, 5);
            this.label9.Margin = new System.Windows.Forms.Padding(10, 5, 5, 5);
            this.label9.Name = "label9";
            this.label9.Size = new System.Drawing.Size(90, 60);
            this.label9.TabIndex = 0;
            this.label9.Text = "Name\r\n님 환영합니다.";
            this.label9.TextAlign = System.Drawing.ContentAlignment.MiddleLeft;
            // 
            // manage_left_time_label
            // 
            this.manage_left_time_label.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom) 
            | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.manage_left_time_label.AutoSize = true;
            this.manage_left_time_label.Cursor = System.Windows.Forms.Cursors.Hand;
            this.manage_left_time_label.Font = new System.Drawing.Font("예스체", 9F, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, ((byte)(129)));
            this.manage_left_time_label.Location = new System.Drawing.Point(5, 75);
            this.manage_left_time_label.Margin = new System.Windows.Forms.Padding(5);
            this.manage_left_time_label.Name = "manage_left_time_label";
            this.manage_left_time_label.Size = new System.Drawing.Size(95, 30);
            this.manage_left_time_label.TabIndex = 1;
            this.manage_left_time_label.Text = "구독관리 3개월";
            this.manage_left_time_label.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            this.manage_left_time_label.Click += new System.EventHandler(this.Manage_subscription);
            // 
            // manage_my_page_label
            // 
            this.manage_my_page_label.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom) 
            | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.manage_my_page_label.AutoSize = true;
            this.manage_my_page_label.Cursor = System.Windows.Forms.Cursors.Hand;
            this.manage_my_page_label.Font = new System.Drawing.Font("예스체", 9F);
            this.manage_my_page_label.Location = new System.Drawing.Point(5, 115);
            this.manage_my_page_label.Margin = new System.Windows.Forms.Padding(5);
            this.manage_my_page_label.Name = "manage_my_page_label";
            this.manage_my_page_label.Size = new System.Drawing.Size(95, 28);
            this.manage_my_page_label.TabIndex = 2;
            this.manage_my_page_label.Text = "마이페이지";
            this.manage_my_page_label.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            this.manage_my_page_label.Click += new System.EventHandler(this.Manage_MyPage);
            // 
            // Form1
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(7F, 12F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(800, 450);
            this.Controls.Add(this.tableLayoutPanel1);
            this.Controls.Add(this.target_url_panel);
            this.Controls.Add(this.option_panel_3);
            this.Controls.Add(this.option_panel_2);
            this.Controls.Add(this.option_panel_1);
            this.Controls.Add(this.save_input_btn);
            this.Controls.Add(this.reset_btn);
            this.Controls.Add(this.extract_db_btn);
            this.Controls.Add(this.extract_id_btn);
            this.Controls.Add(this.except_file_select_btn);
            this.Controls.Add(this.extract_file_select_btn);
            this.Controls.Add(this.except_keyword_add_btn);
            this.Controls.Add(this.extract_keyword_add_btn);
            this.Controls.Add(this.except_keyword_input);
            this.Controls.Add(this.target_url_setting_btn);
            this.Controls.Add(this.target_url_input);
            this.Controls.Add(this.extract_keyword_input);
            this.Controls.Add(this.label8);
            this.Controls.Add(this.save_btn);
            this.Controls.Add(this.timeBox);
            this.Controls.Add(this.label7);
            this.Controls.Add(this.label4);
            this.Controls.Add(this.except_keyword_list);
            this.Controls.Add(this.extract_keyword_list);
            this.Controls.Add(this.label3);
            this.Controls.Add(this.target_keywords_label);
            this.Controls.Add(this.label2);
            this.Controls.Add(this.label1);
            this.Controls.Add(this.log_text);
            this.Controls.Add(this.login_btn);
            this.Controls.Add(this.pw_input);
            this.Controls.Add(this.id_input);
            this.Controls.Add(this.PW_label);
            this.Controls.Add(this.ID_label);
            this.Icon = ((System.Drawing.Icon)(resources.GetObject("$this.Icon")));
            this.Name = "Form1";
            this.Text = "타겟 카페 DB 추출기";
            this.option_panel_1.ResumeLayout(false);
            this.option_panel_1.PerformLayout();
            ((System.ComponentModel.ISupportInitialize)(this.start_page)).EndInit();
            ((System.ComponentModel.ISupportInitialize)(this.end_page)).EndInit();
            this.option_panel_2.ResumeLayout(false);
            this.option_panel_2.PerformLayout();
            this.option_panel_3.ResumeLayout(false);
            this.option_panel_3.PerformLayout();
            this.target_url_panel.ResumeLayout(false);
            this.target_url_panel.PerformLayout();
            this.tableLayoutPanel1.ResumeLayout(false);
            this.tableLayoutPanel1.PerformLayout();
            this.ResumeLayout(false);
            this.PerformLayout();

        }


        #endregion

        private System.Windows.Forms.Label ID_label;
        private System.Windows.Forms.Label PW_label;
        private System.Windows.Forms.TextBox id_input;
        private System.Windows.Forms.TextBox pw_input;
        private System.Windows.Forms.Button login_btn;
        private System.Windows.Forms.TextBox log_text;
        private System.Windows.Forms.Label label1;
        private System.Windows.Forms.Label label2;
        private System.Windows.Forms.Label target_keywords_label;
        private System.Windows.Forms.Label label3;
        private System.Windows.Forms.ListBox extract_keyword_list;
        private System.Windows.Forms.ListBox except_keyword_list;
        private System.Windows.Forms.Label label4;
        private System.Windows.Forms.Label label7;
        private System.Windows.Forms.ComboBox timeBox;
        private System.Windows.Forms.Button save_btn;
        private System.Windows.Forms.Label label8;
        private System.Windows.Forms.TextBox extract_keyword_input;
        private System.Windows.Forms.TextBox target_url_input;
        private System.Windows.Forms.Button target_url_setting_btn;
        private System.Windows.Forms.TextBox except_keyword_input;
        private System.Windows.Forms.Button extract_keyword_add_btn;
        private System.Windows.Forms.Button except_keyword_add_btn;
        private System.Windows.Forms.Button extract_file_select_btn;
        private System.Windows.Forms.Button except_file_select_btn;
        private System.Windows.Forms.Button extract_id_btn;
        private System.Windows.Forms.Button extract_db_btn;
        private System.Windows.Forms.Button reset_btn;
        private System.Windows.Forms.Button save_input_btn;
        private System.Windows.Forms.RadioButton radioButton1;
        private System.Windows.Forms.RadioButton radioButton2;
        private System.Windows.Forms.Panel option_panel_1;
        private System.Windows.Forms.RadioButton radioButton3;
        private System.Windows.Forms.RadioButton radioButton4;
        private System.Windows.Forms.RadioButton radioButton5;
        private System.Windows.Forms.RadioButton radioButton6;
        private System.Windows.Forms.RadioButton radioButton7;
        private System.Windows.Forms.DateTimePicker start_date;
        private System.Windows.Forms.DateTimePicker end_date;
        private System.Windows.Forms.NumericUpDown start_page;
        private System.Windows.Forms.NumericUpDown end_page;
        private System.Windows.Forms.Label label5;
        private System.Windows.Forms.Label label6;
        private System.Windows.Forms.Panel option_panel_2;
        private System.Windows.Forms.RadioButton radioButton8;
        private System.Windows.Forms.RadioButton radioButton9;
        private System.Windows.Forms.Panel option_panel_3;
        private System.Windows.Forms.RadioButton cafe_url_radio;
        private System.Windows.Forms.RadioButton article_url_radio;
        private System.Windows.Forms.Panel target_url_panel;
        private System.Windows.Forms.TableLayoutPanel tableLayoutPanel1;
        private System.Windows.Forms.Label label9;
        private System.Windows.Forms.Label manage_left_time_label;
        private System.Windows.Forms.Label label14;
        private System.Windows.Forms.Label logout;
        private System.Windows.Forms.Label QnA_label;
        private System.Windows.Forms.Label manage_my_page_label;
    }
}

