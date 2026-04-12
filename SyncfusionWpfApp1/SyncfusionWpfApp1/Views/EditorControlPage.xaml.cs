using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Windows;
using System.Windows.Controls;
using Syncfusion.SfSkinManager;
using Syncfusion.Windows.Edit;
using SyncfusionWpfApp1.Model;
using SyncfusionWpfApp1.ViewModels;
namespace SyncfusionWpfApp1.Views
{
    public partial class EditorControlPage : Page
    {
		public string themeName = App.Current.Properties["Theme"]?.ToString()!= null? App.Current.Properties["Theme"]?.ToString(): "Windows11Light";
        public EditorControlPage(EditorControlViewModel viewModel)
        {
            InitializeComponent();
            DataContext = viewModel;
			SfSkinManager.SetTheme(this, new Theme(themeName));
			ObservableCollection<CustomIntelliSenseItem> customItems = new
            ObservableCollection<CustomIntelliSenseItem>();
            //Intializing sub-items for products
            ObservableCollection<CustomIntelliSenseItem> productsSubItem = new
            ObservableCollection<CustomIntelliSenseItem>();
            productsSubItem.Add(new CustomIntelliSenseItem() { Text = "ID" });
            productsSubItem.Add(new CustomIntelliSenseItem() { Text = "Name" });
            productsSubItem.Add(new CustomIntelliSenseItem() { Text = "Manufacturer" });
            productsSubItem.Add(new CustomIntelliSenseItem() { Text = "Price" });
            productsSubItem.Add(new CustomIntelliSenseItem() { Text = "OrderQuantity" });
            productsSubItem.Add(new CustomIntelliSenseItem() { Text = "Units" });
            //Intializing sub-items for employee
            ObservableCollection<CustomIntelliSenseItem> employeeSubItem = new
            ObservableCollection<CustomIntelliSenseItem>();
            employeeSubItem.Add(new CustomIntelliSenseItem() { Text = "ID" });
            employeeSubItem.Add(new CustomIntelliSenseItem() { Text = "Name" });
            employeeSubItem.Add(new CustomIntelliSenseItem() { Text = "DOB" });
            employeeSubItem.Add(new CustomIntelliSenseItem() { Text = "City" });
            employeeSubItem.Add(new CustomIntelliSenseItem() { Text = "ContactNumber" });
            //Intializing sub-items for customer
            ObservableCollection<CustomIntelliSenseItem> customerSubItem = new
            ObservableCollection<CustomIntelliSenseItem>();
            customerSubItem.Add(new CustomIntelliSenseItem() { Text = "ID" });
            customerSubItem.Add(new CustomIntelliSenseItem() { Text = "Name" });
            customerSubItem.Add(new CustomIntelliSenseItem() { Text = "City" });
            customerSubItem.Add(new CustomIntelliSenseItem() { Text = "State" });
            customerSubItem.Add(new CustomIntelliSenseItem() { Text = "Country" });
            customerSubItem.Add(new CustomIntelliSenseItem() { Text = "ContactNumber" });
            //adding items to main collection
            customItems.Add(new CustomIntelliSenseItem()
            {
                Text = "Products",
                NestedItems =
            productsSubItem
            });
            customItems.Add(new CustomIntelliSenseItem()
            {
                Text = "Employee",
                NestedItems =
            employeeSubItem
            });
            customItems.Add(new CustomIntelliSenseItem()
            {
                Text = "Customer",
                NestedItems =
            customerSubItem
            });
            // Applying custom business object collection as IntelliSenseCustomItemsSource
            editControl.IntellisenseCustomItemsSource = customItems;
        }
    }
}
