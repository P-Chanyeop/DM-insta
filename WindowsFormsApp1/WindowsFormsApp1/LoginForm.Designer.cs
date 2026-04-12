namespace WindowsFormsApp1
{
    partial class LoginForm
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.API_KEY_input = new System.Windows.Forms.TextBox();
            this.API_KEY_label = new System.Windows.Forms.Label();
            this.login_btn = new System.Windows.Forms.Button();
            this.SuspendLayout();
            // 
            // API_KEY_input
            // 
            this.API_KEY_input.Location = new System.Drawing.Point(311, 172);
            this.API_KEY_input.Name = "API_KEY_input";
            this.API_KEY_input.Size = new System.Drawing.Size(151, 21);
            this.API_KEY_input.TabIndex = 0;
            // 
            // API_KEY_label
            // 
            this.API_KEY_label.AutoSize = true;
            this.API_KEY_label.Location = new System.Drawing.Point(248, 175);
            this.API_KEY_label.Name = "API_KEY_label";
            this.API_KEY_label.Size = new System.Drawing.Size(38, 12);
            this.API_KEY_label.TabIndex = 1;
            this.API_KEY_label.Text = "label1";
            this.API_KEY_label.Click += new System.EventHandler(this.label1_Click);
            // 
            // login_btn
            // 
            this.login_btn.Location = new System.Drawing.Point(480, 175);
            this.login_btn.Name = "login_btn";
            this.login_btn.Size = new System.Drawing.Size(75, 23);
            this.login_btn.TabIndex = 2;
            this.login_btn.Text = "button1";
            this.login_btn.UseVisualStyleBackColor = true;
            this.login_btn.Click += new System.EventHandler(this.login_check);
            // 
            // LoginForm
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(7F, 12F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(800, 450);
            this.Controls.Add(this.login_btn);
            this.Controls.Add(this.API_KEY_label);
            this.Controls.Add(this.API_KEY_input);
            this.Name = "LoginForm";
            this.Text = "LoginForm";
            this.Load += new System.EventHandler(this.LoginForm_Load);
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.TextBox API_KEY_input;
        private System.Windows.Forms.Label API_KEY_label;
        private System.Windows.Forms.Button login_btn;
    }
}