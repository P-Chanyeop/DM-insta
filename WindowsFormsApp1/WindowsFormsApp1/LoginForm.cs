using OpenQA.Selenium;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace WindowsFormsApp1
{
    public partial class LoginForm : Form
    {
        public LoginForm()
        {
            InitializeComponent();
        }

        private void LoginForm_Load(object sender, EventArgs e)
        {
        }

        private void login_check(object sender, EventArgs e)
        {
            string key = this.API_KEY_input.Text; // API Key 입력

            /* 인증로직 
            1. API_KEY를 서버로 전송하여 인증을 받는다.
            2. 인증이 성공하면 MainForm을 생성하여 보여준다.
            3. 인증이 실패하면 로그인 실패 메세지를 띄운다.
            */

            // 인증 로직


            if (key == "")
            {
                MessageBox.Show("API 키를 입력해주세요.");
                return;
            }
            /*else if (Response.FromJson("message") == "Fail")
            {
                MessageBox.Show("로그인 실패. 올바른 API Key를 입력해주세요.");
            }*/
            else
            {
                // 로그인 성공 시 메인 폼을 열고 현재 창을 숨김
                Form1 mainForm = new Form1();
                mainForm.Show();
                this.Hide();
            }
        }

        // 폼이 닫힐 때 프로그램 종료
        private void LoginForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            Application.Exit();
        }

        private void label1_Click(object sender, EventArgs e)
        {

        }

        private void API_KEY_input_TextChanged(object sender, EventArgs e)
        {

        }
    }
}
