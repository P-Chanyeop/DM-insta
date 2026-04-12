using System.Windows.Controls;

using SyncfusionWpfApp1.ViewModels;

namespace SyncfusionWpfApp1.Views
{
    public partial class MainPage : Page
    {
        public MainPage(MainViewModel viewModel)
        {
            InitializeComponent();
            DataContext = viewModel;
        }
    }
}
