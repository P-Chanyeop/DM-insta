using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Windows;

using Syncfusion.Windows.PropertyGrid;

using SyncfusionWpfApp1.Contracts.Services;
using SyncfusionWpfApp1.Helpers;
using SyncfusionWpfApp1.Models;

namespace SyncfusionWpfApp1.ViewModels
{
    public class PropertyGridViewModel : Observable
    {
        private PropertyItem selectedPropertyItem;

        public PropertyItem SelectedPropertyItem
        {
            get { return selectedPropertyItem; }
            set
            {
                if(selectedPropertyItem != value)
                {
                    selectedPropertyItem = value;
                    RaisePropertyChanged(nameof(SelectedPropertyItem));
                }
            }
        }

        private bool enableGrouping;

        public bool EnableGrouping
        {
            get { return enableGrouping; }
            set
            {
                enableGrouping = value;
                this.RaisePropertyChanged(nameof(this.EnableGrouping));
            }
        }

        private bool enableToolTip;

        public bool EnableToolTip
        {
            get { return enableToolTip; }
            set
            {
                enableToolTip = value;
                this.RaisePropertyChanged(nameof(this.EnableToolTip));
            }
        }

        private Visibility buttonPanelVisibility = Visibility.Visible;

        public Visibility ButtonPanelVisibility
        {
            get { return buttonPanelVisibility; }
            set
            {
                buttonPanelVisibility = value;
                this.RaisePropertyChanged(nameof(this.ButtonPanelVisibility));
            }
        }

        private Visibility searchBoxVisibility = Visibility.Visible;

        public Visibility SearchBoxVisibility
        {
            get { return searchBoxVisibility; }
            set
            {
                searchBoxVisibility = value;
                this.RaisePropertyChanged(nameof(this.SearchBoxVisibility));
            }
        }

        private Visibility descriptionPanelVisibility = Visibility.Visible;

        public Visibility DescriptionPanelVisibility
        {
            get { return descriptionPanelVisibility; }
            set
            {
                descriptionPanelVisibility = value;
                this.RaisePropertyChanged(nameof(this.DescriptionPanelVisibility));
            }
        }

        private PropertyExpandModes propertyExpandMode = PropertyExpandModes.NestedMode;

        public PropertyExpandModes PropertyExpandMode
        {
            get { return propertyExpandMode; }
            set
            {
                propertyExpandMode = value;
                this.RaisePropertyChanged(nameof(this.PropertyExpandMode));
            }
        }

        private ListSortDirection? sortDirection = null;
        /// <summary>
        /// Gets or sets a value indicating the sort direction (Ascending/Desceding) of the properties.
        /// </summary>
        public ListSortDirection? SortDirection
        {
            get
            {
                return sortDirection;
            }

            set
            {
                if (sortDirection != value)
                {
                    sortDirection = value;
                    RaisePropertyChanged(nameof(SortDirection));
                }
            }
        }

        /// <summary>
        /// Property which stores PropertyNameColumnDefinition 
        /// </summary>
        private GridLength propertyNameColumnDefinition = new GridLength(250);
        public GridLength PropertyNameColumnDefinition
        {
            get
            {
                return propertyNameColumnDefinition;
            }
            set
            {
                if (propertyNameColumnDefinition != value)
                {
                    propertyNameColumnDefinition = value;
                    RaisePropertyChanged(nameof(PropertyNameColumnDefinition));
                }
            }
        }

        public PropertyGridViewModel()
        {

        }

    }
}
