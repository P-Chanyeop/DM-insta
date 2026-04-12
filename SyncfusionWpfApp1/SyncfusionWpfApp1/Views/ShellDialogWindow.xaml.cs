using System.Windows.Controls;

using Syncfusion.SfSkinManager;
using Syncfusion.Windows.Shared;

using SyncfusionWpfApp1.Contracts.Views;
using SyncfusionWpfApp1.ViewModels;

namespace SyncfusionWpfApp1.Views
{
    public partial class ShellDialogWindow : ChromelessWindow, IShellDialogWindow
    {
        public ShellDialogWindow(ShellDialogViewModel viewModel)
        {
            InitializeComponent();
            viewModel.SetResult = OnSetResult;
            DataContext = viewModel;
        }

        public Frame GetDialogFrame()
            => dialogFrame;

        private void OnSetResult(bool? result)
        {
            DialogResult = result;
            Close();
        }
    }
}
