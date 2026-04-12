using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Syncfusion.Windows.Shared;

namespace SyncfusionWpfApp1.Models
{
    public class PivotGrid
    {
        public string Product
        {
            get;
            set;
        }
        public string Date
        {
            get;
            set;
        }
        public string Country
        {
            get;
            set;
        }
        public string State
        {
            get;
            set;
        }
        public int Quantity
        {
            get;
            set;
        }
        public double Amount
        {
            get;
            set;
        }
        public static ProductSalesCollection GetSalesData()
        {
            /// Geography
            string[] countries = new string[] {
            "Canada"
        };
            string[] canadaStates = new string[] {
            "Alberta",
            "British Columbia",
            "Ontario"
        };
            /// Time
            string[] dates = new string[] {
            "FY 2005",
            "FY 2006",
            "FY 2007"
        };
            /// Products
            string[] products = new string[] {
            "Bike",
            "Car"
        };
            Random r = new Random(123345345);
            int numberOfRecords = 2000;
            ProductSalesCollection listOfProductSales = new ProductSalesCollection();
            for (int i = 0; i < numberOfRecords; i++)
            {
                PivotGrid sales = new PivotGrid();
                sales.Country = countries[r.Next(0, countries.GetLength(0))];
                sales.Quantity = r.Next(1, 12);
                /// 1 percent discount for 1 quantity
                double discount = (30000 * sales.Quantity) * (double.Parse(sales.Quantity.ToString()) / 100);
                sales.Amount = (30000 * sales.Quantity) - discount;
                sales.Date = dates[r.Next(r.Next(dates.GetLength(0) + 1))];
                sales.Product = products[r.Next(r.Next(products.GetLength(0) + 1))];
                sales.State = canadaStates[r.Next(canadaStates.GetLength(0))];
                listOfProductSales.Add(sales);
            }
            return listOfProductSales;
        }
        public override string ToString()
        {
            return string.Format("{0}-{1}-{2}", this.Country, this.State, this.Product);
        }
        public class ProductSalesCollection : List<PivotGrid>
        {

        }
    }
}
