using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;
using WpfApp1.ViewModel;

namespace WpfApp1
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            FontSelect.DataContext = new FontViewModel();
            FontSizeSelect.DataContext = new FontSizeViewModel();

            // WebBrowser 컨트롤에 스마트 에디터 URL 로드
            webBrowser.Navigate("https://github.com/naver/smarteditor2");


        }

        private void CheckBox_Checked(object sender, RoutedEventArgs e)
        {

        }

        // 글꼴 설정 변경 시 호출
        private void ComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            // 선택된 항목에 대한 처리를 여기에 작성합니다.
            var comboBox = sender as ComboBox;
            if (comboBox?.SelectedItem != null)
            {
                // 선택된 폰트에 대한 작업 수행
                var selectedFont = comboBox.SelectedItem;
                // 예를 들어, 폰트를 변경하는 로직 추가
            }
        }

        // 글꼴 크기 설정 변경 시 호출
        private void ComboBox_SelectionChanged2(object sender, SelectionChangedEventArgs e)
        {
            // 선택된 항목에 대한 처리를 여기에 작성합니다.
            var comboBox = sender as ComboBox;
            if (comboBox?.SelectedItem != null)
            {
                // 선택된 폰트에 대한 작업 수행
                var selectedFontSize = comboBox.SelectedItem;
                // 예를 들어, 폰트를 변경하는 로직 추가
            }
        }
    }
}