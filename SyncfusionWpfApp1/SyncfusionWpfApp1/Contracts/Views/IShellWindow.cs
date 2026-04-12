using System.Windows.Controls;

namespace SyncfusionWpfApp1.Contracts.Views
{
    public interface IShellWindow
    {
        Frame GetNavigationFrame();

        void ShowWindow();

        void CloseWindow();
    }
}
