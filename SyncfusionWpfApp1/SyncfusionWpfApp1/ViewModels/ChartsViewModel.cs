using System;
using System.Collections.ObjectModel;

using SyncfusionWpfApp1.Contracts.Services;
using SyncfusionWpfApp1.Helpers;
using SyncfusionWpfApp1.Models;

namespace SyncfusionWpfApp1.ViewModels
{
    public class ChartsViewModel : Observable
    {
       public ObservableCollection<ChartsModel> SalesData { get; }

        public ObservableCollection<ChartsModel> Data { get; }

        public ChartsViewModel()
        {
            this.SalesData = new ObservableCollection<ChartsModel>();
            SalesData.Add(new ChartsModel() { Name = "Product A", SalesRate = 25 });
            SalesData.Add(new ChartsModel() { Name = "Product B", SalesRate = 17 });
            SalesData.Add(new ChartsModel() { Name = "Product C", SalesRate = 30 });
            SalesData.Add(new ChartsModel() { Name = "Product D", SalesRate = 18 });
            SalesData.Add(new ChartsModel() { Name = "Product E", SalesRate = 10 });
            SalesData.Add(new ChartsModel() { Name = "Product F", SalesRate = 21 });


            this.Data = new ObservableCollection<ChartsModel>();
            Data.Add(new ChartsModel() { Name = "Product A", Imports = 2.2, Exports = 1.2 });
            Data.Add(new ChartsModel() { Name = "Product B", Imports = 2.4, Exports = 1.3 });
            Data.Add(new ChartsModel() { Name = "Product C", Imports = 3, Exports = 1.5 });
            Data.Add(new ChartsModel() { Name = "Product D", Imports = 3.1, Exports = 2.2 });
        }
    }
}
