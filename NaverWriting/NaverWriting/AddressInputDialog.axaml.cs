using Avalonia;
using Avalonia.Controls;
using Avalonia.Markup.Xaml;

namespace NaverWriting;

public partial class AddressInputDialog : Window
{
    public string? Address { get; private set; }

    public AddressInputDialog()
    {
        InitializeComponent();
    }

    private void OnOkButtonClick(object? sender, Avalonia.Interactivity.RoutedEventArgs e)
    {
        Address = this.FindControl<TextBox>("AddressTextBox").Text;
        Close(Address);  // 입력된 주소 반환하며 대화 상자 닫기
    }

    private void OnCancelButtonClick(object? sender, Avalonia.Interactivity.RoutedEventArgs e)
    {
        Close(null);  // 취소 시 null 반환하며 대화 상자 닫기
    }
}